export default function manifest() {
  return {
    name: 'Preva Kitchen',
    short_name: 'Preva Kitchen',
    description: 'Wings, lamb chops, Rasta pasta & Caribbean comfort food in Redford Township, MI. Dine in, pickup, delivery and catering.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0907',
    theme_color: '#0a0907',
    icons: [
      { src: '/icon', sizes: '48x48', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  };
}
