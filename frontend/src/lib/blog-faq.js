// A FAQ accordion item whose answer is missing or blank would show a question
// that expands to nothing. Drop those items (and the whole block if none are
// left) when a post is rendered, instead of publishing a dead accordion.
const FAQ_ITEM = /<details\b[^>]*preva-faq-item[^>]*>[\s\S]*?<\/details>/gi;
const FAQ_ANSWER = /<div\b[^>]*preva-faq-answer[^>]*>([\s\S]*?)<\/div>/i;
const EMPTY_FAQ_BLOCK = /<div\b[^>]*preva-faq-block[^>]*>\s*(?:<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>)?\s*<\/div>/gi;

export function dropEmptyFaqItems(html) {
  const source = String(html || '');
  if (!source.includes('preva-faq-item')) return source;
  const kept = source.replace(FAQ_ITEM, (item) => {
    const answer = item.match(FAQ_ANSWER)?.[1] || '';
    const text = answer.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    return text ? item : '';
  });
  return kept.replace(EMPTY_FAQ_BLOCK, '');
}
