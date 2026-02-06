import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WishZep',
    short_name: 'WishZep',
    description: 'Premium Modern Aura Shop - Curated techwear and performance gear.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#BE29EC',
    icons: [
      {
        src: 'https://picsum.photos/seed/wishzep-pwa-192/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/wishzep-pwa-512/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
