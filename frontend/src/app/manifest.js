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
      { src: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  };
}
