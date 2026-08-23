/**
 * A very small router.
 *
 * The point of it is that the same handler runs whether a request arrives over
 * HTTP from the browser or is called directly by a server component rendering a
 * page. One implementation, one set of rules, no second code path to keep in
 * sync — which is what went wrong when the API lived in a separate Express
 * process and the site talked to it over the network.
 */

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Bad request', details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const forbidden = (message = 'Forbidden: insufficient permissions') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);

/** Wrap a value so a handler can set a status or headers when it needs to. */
export function result(body, { status = 200, headers = {}, cookies = [] } = {}) {
  return { __result: true, body, status, headers, cookies };
}

const routes = [];

function compile(pattern) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/\/$/, '')
        .split('/')
        .map((segment) => {
          if (segment.startsWith(':')) {
            keys.push(segment.slice(1));
            return '/([^/]+)';
          }
          if (segment === '*') {
            keys.push('rest');
            return '/(.*)';
          }
          return segment ? '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
        })
        .join('') +
      '/?$'
  );
  return { regex, keys };
}

function register(method, pattern, options, handler) {
  const { regex, keys } = compile(pattern);
  routes.push({ method, pattern, regex, keys, handler, ...options });
}

export const get = (pattern, options, handler) =>
  handler ? register('GET', pattern, options, handler) : register('GET', pattern, {}, options);
export const post = (pattern, options, handler) =>
  handler ? register('POST', pattern, options, handler) : register('POST', pattern, {}, options);
export const put = (pattern, options, handler) =>
  handler ? register('PUT', pattern, options, handler) : register('PUT', pattern, {}, options);
export const patch = (pattern, options, handler) =>
  handler ? register('PATCH', pattern, options, handler) : register('PATCH', pattern, {}, options);
export const del = (pattern, options, handler) =>
  handler ? register('DELETE', pattern, options, handler) : register('DELETE', pattern, {}, options);

export function match(method, path) {
  const clean = ('/' + String(path || '').replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
  for (const route of routes) {
    if (route.method !== method) continue;
    const found = route.regex.exec(clean);
    if (!found) continue;
    const params = {};
    route.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(found[index + 1]);
    });
    return { route, params };
  }
  return null;
}

/**
 * Run a request through the router.
 *
 * @returns {{ status:number, body:any, headers:object, cookies:array }}
 */
export async function dispatch({ method = 'GET', path, query = {}, body = null, user = null, request = null, ip = '' }) {
  const found = match(method, path);
  if (!found) {
    return { status: 404, body: { message: 'Endpoint not found' }, headers: {}, cookies: [] };
  }

  const { route, params } = found;

  try {
    if (route.auth && !user) throw unauthorized();
    if (
      user?.role === 'CAREERS_MANAGER' &&
      path.startsWith('/admin/') &&
      !path.startsWith('/admin/profile') &&
      !path.startsWith('/admin/careers') &&
      !path.startsWith('/admin/career-jobs') &&
      !path.startsWith('/admin/career-applications')
    ) {
      throw forbidden('This account can only access careers management.');
    }
    const scopedAdminPrefixes = {
      EDITOR: [
        '/admin/dashboard', '/admin/profile', '/admin/content', '/admin/media',
        '/admin/categories', '/admin/tags', '/admin/galleries', '/admin/services',
        '/admin/ordering-platforms'
      ],
      AUTHOR: [
        '/admin/dashboard', '/admin/profile', '/admin/content', '/admin/media',
        '/admin/categories', '/admin/tags'
      ]
    };
    const scopedPrefixes = scopedAdminPrefixes[user?.role];
    if (
      scopedPrefixes &&
      path.startsWith('/admin/') &&
      !scopedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    ) {
      throw forbidden('This account does not have permission to access that admin area.');
    }
    if (route.roles && !route.roles.includes(user?.role)) throw forbidden();

    const output = await route.handler({ params, query, body, user, request, ip, method, path });

    if (output && output.__result) {
      return { status: output.status, body: output.body, headers: output.headers, cookies: output.cookies };
    }
    return { status: 200, body: output ?? null, headers: {}, cookies: [] };
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        body: { message: error.message, ...(error.details ? { details: error.details } : {}) },
        headers: {},
        cookies: []
      };
    }
    console.error(`[api] ${method} ${path}`, error);
    return { status: 500, body: { message: 'Something went wrong on our side.' }, headers: {}, cookies: [] };
  }
}

/** Exposed for tests and for the route-list command. */
export function listRoutes() {
  return routes.map((r) => `${r.method} ${r.pattern}`).sort();
}
