
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'WishZep | Modern Aura Shop',
  description: 'Eye-catching design with glassmorphism and premium products.',
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
