import { MetadataRoute } from 'next';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wishzep.shop';
  
  // Static Routes
  const routes = [
    '',
    '/products',
    '/collections',
    '/info/about',
    '/info/contact',
    '/info/shipping',
    '/info/privacy',
    '/info/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic Product Routes
  let productRoutes: any[] = [];
  try {
    const { firestore } = initializeFirebase();
    const productsSnapshot = await getDocs(collection(firestore, 'products'));
    productRoutes = productsSnapshot.docs.map((doc) => ({
      url: `${baseUrl}/products/${doc.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    // Fallback if firestore fails
  }

  return [...routes, ...productRoutes];
}