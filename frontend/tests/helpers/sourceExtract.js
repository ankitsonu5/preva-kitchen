// Lightweight source-extraction helpers used by the SEO guardrail tests.
//
// WHY THIS EXISTS: Next.js App Router page.js files mix server metadata
// (generateMetadata / export const metadata / inline JSON-LD builders) with
// client JSX in the same file. Vitest's default Node environment has no JSX
// transform configured for plain .js files, so importing a page.js module
// directly would fail on its `<div>...</div>` markup long before we ever
// reach the metadata we actually want to test.
//
// Rather than bolting on a JSX/Babel pipeline for a handful of logic checks,
// these helpers read the page file as TEXT and pull out just the real
// expression that builds metadata or JSON-LD (e.g. the object literal passed
// to `pageMetadata({ ... })`, or the body of `function fooSchema(origin) {
// ... }`). That extracted source is then evaluated with `new Function(...)`
// against a small, explicit scope (the real pageMetadata/generateBreadcrumbSchema
// functions, plus fixture data standing in for CMS-fetched values like
// `product` or `job`). This exercises the ACTUAL source text shipped in the
// page — if a developer deletes `description:` from the object literal, or
// breaks the @id template string, the extracted source changes and the test
// reflects that — without needing a full React render.
//
// This is intentionally a heuristic, not a parser: it works by counting
// bracket depth while skipping over string/template literals and comments,
// which is sufficient for this codebase's straightforward object-literal and
// function patterns. It is not a general-purpose JS parser.

import fs from 'node:fs';

/** Read a file's full text. Small wrapper so tests don't sprinkle fs calls. */
export function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Given `source` and an index pointing at an opening bracket ('{', '(' or
 * '['), return the substring from that index through its matching closing
 * bracket (inclusive), skipping over string/template literals and comments
 * so brackets inside them are never miscounted.
 */
export function extractBalanced(source, openIndex) {
  const open = source[openIndex];
  const pairs = { '{': '}', '(': ')', '[': ']' };
  const close = pairs[open];
  if (!close) {
    throw new Error(`extractBalanced: unsupported opening character "${open}" at index ${openIndex}`);
  }

  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];

    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipStringLiteral(source, i, ch);
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }

  throw new Error(`extractBalanced: no matching "${close}" found starting at index ${openIndex}`);
}

function skipStringLiteral(source, i, quote) {
  i++;
  for (; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === quote) return i;
  }
  return i;
}

/**
 * Find the first call to `calleeName(...)` in `source` and return the source
 * text INSIDE the parentheses (the raw argument list, not evaluated).
 * Returns null if no such call exists.
 */
export function extractCallArgs(source, calleeName) {
  const marker = `${calleeName}(`;
  const idx = source.indexOf(marker);
  if (idx === -1) return null;
  const openParenIndex = idx + calleeName.length;
  const withParens = extractBalanced(source, openParenIndex);
  return withParens.slice(1, -1);
}

/**
 * Find `const NAME = <value>` (optionally `export const`) and return the
 * source text of <value>, where <value> starts with '{', '[' or '('.
 * Returns null if not found or if the value isn't bracket-shaped (e.g. it's
 * a call expression like `pageMetadata(...)` — use extractCallArgs for that).
 */
export function extractConstValue(source, constName) {
  const re = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*`);
  const m = re.exec(source);
  if (!m) return null;
  const startIdx = m.index + m[0].length;
  const openChar = source[startIdx];
  if (!'{(['.includes(openChar)) return null;
  return extractBalanced(source, startIdx);
}

/**
 * Find `const NAME = <expression>;` (optionally `export const`) where
 * <expression> may be ANY expression (ternary, template literal, call, etc,
 * not just an object/array/paren literal) and return the expression's source
 * text (without the trailing semicolon). Unlike extractConstValue, this
 * scans for the statement-terminating top-level `;`, so it also handles
 * cases like `const description = cond ? a : b;`.
 */
export function extractStatementSource(source, constName) {
  const re = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*`);
  const m = re.exec(source);
  if (!m) return null;

  const start = m.index + m[0].length;
  let depth = 0;
  let i = start;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipStringLiteral(source, i, ch);
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if ('{(['.includes(ch)) depth++;
    else if ('})]'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) break;
  }

  return source.slice(start, i);
}

/**
 * Find `function NAME(...) { ... }` and return its full source (signature +
 * body). Returns null if not found.
 */
export function extractFunctionSource(source, fnName) {
  const re = new RegExp(`function\\s+${fnName}\\s*\\(`);
  const m = re.exec(source);
  if (!m) return null;
  const parenOpenIdx = m.index + m[0].length - 1;
  const paramsSrc = extractBalanced(source, parenOpenIdx);
  const bodyOpenIdx = source.indexOf('{', parenOpenIdx + paramsSrc.length);
  const bodySrc = extractBalanced(source, bodyOpenIdx);
  return source.slice(m.index, bodyOpenIdx + bodySrc.length);
}

/**
 * Evaluate a standalone expression's source text against a scope object.
 * Used for object/array literals extracted above (e.g. the args passed to
 * pageMetadata({...})).
 */
export function evalExpression(code, scope = {}) {
  const keys = Object.keys(scope);
  const values = keys.map((k) => scope[k]);
  // eslint-disable-next-line no-new-func -- intentional: evaluating trusted, repo-owned source text extracted above, in tests only.
  const fn = new Function(...keys, `"use strict"; return (\n${code}\n);`);
  return fn(...values);
}

/**
 * Run an extracted `function fnName(...) { ... }` source against a scope and
 * positional call arguments, returning its return value.
 */
export function callExtractedFunction(fnSource, fnName, callArgs = [], scope = {}) {
  const keys = Object.keys(scope);
  const values = keys.map((k) => scope[k]);
  const argNames = callArgs.map((_, idx) => `__arg${idx}`);
  const body = `"use strict";\n${fnSource}\nreturn ${fnName}(${argNames.join(', ')});`;
  // eslint-disable-next-line no-new-func -- intentional, see evalExpression above.
  const fn = new Function(...keys, ...argNames, body);
  return fn(...values, ...callArgs);
}
