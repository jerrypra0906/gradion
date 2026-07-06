import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gradion — Confident Parent, Meaningful Progress.',
    short_name: 'Gradion',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1A2B4C',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-big.png',
        sizes: '320x320',
        type: 'image/png',
      },
    ],
  };
}
