import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Suspense } from 'react';

export const viewport: Viewport = {
  themeColor: '#BE29EC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://wishzep.com'),
  title: {
    default: 'WishZep | Premium Modern Aura Shop',
    template: '%s | WishZep'
  },
  description: 'WishZep is the ultimate destination for curated high-energy techwear and performance gear. Shop the future of fashion today.',
  applicationName: 'WishZep',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WishZep',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  keywords: ['techwear', 'fashion', 'performance gear', 'WishZep', 'modern aura', 'luxury street wear'],
  authors: [{ name: 'Aditya Choudhary' }],
  creator: 'Aditya Choudhary',
  publisher: 'WishZep',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wishzep.com',
    title: 'WishZep | Premium Modern Aura Shop',
    description: 'Curated high-energy techwear and performance gear for visionaries.',
    siteName: 'WishZep',
    images: [
      {
        url: 'https://picsum.photos/seed/wishzep-og/1200/630',
        width: 1200,
        height: 630,
        alt: 'WishZep Experience',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WishZep | Premium Modern Aura Shop',
    description: 'Shop curated high-energy techwear and performance gear.',
    images: ['https://picsum.photos/seed/wishzep-twitter/1200/630'],
    creator: '@wishzep',
  },
  alternates: {
    canonical: 'https://wishzep.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <Suspense fallback={<div className="h-20 glass fixed top-0 left-0 right-0 z-50 animate-pulse" />}>
            <Navbar />
          </Suspense>
          <main className="min-h-screen pt-20">
            <Suspense fallback={<div className="container mx-auto p-20 text-center animate-pulse">Loading experience...</div>}>
              {children}
            </Suspense>
          </main>
          <Footer />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
