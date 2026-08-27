const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#050507"/>
  <circle cx="32" cy="32" r="25" fill="none" stroke="#d6af55" stroke-width="2"/>
  <text x="32" y="43" fill="#f1d68c" font-family="Roboto, Arial, sans-serif" font-size="36" font-weight="700" text-anchor="middle">P</text>
</svg>`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(favicon.trim(), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
    }
  });
}
