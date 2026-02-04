
"use client";

import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function DynamicInfoPage() {
  const { slug } = useParams();
  const db = useFirestore();

  const pagesQuery = useMemoFirebase(() => {
    if (!db || !slug) return null;
    return query(collection(db, 'pages'), where('slug', '==', slug), limit(1));
  }, [db, slug]);

  const { data: pages, isLoading } = useCollection(pagesQuery);
  const page = pages?.[0];

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-20 space-y-8 max-w-4xl">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
        </div>
      </div>
    );
  }

  if (!page) {
    // Fallback for demo if no data in firestore yet
    return (
      <div className="container mx-auto px-6 py-20 max-w-4xl space-y-12">
        <h1 className="text-5xl font-black capitalize">{slug?.toString().replace('-', ' ')}</h1>
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-xl text-muted-foreground leading-relaxed">
            This page information is currently being updated. WishZep is committed to providing full transparency and high-quality service to our community.
          </p>
          <div className="glass p-10 rounded-[2.5rem] mt-12">
            <h3 className="text-2xl font-bold mb-4">Under Construction</h3>
            <p>We are currently migrating our internal documentation to the aura-charged cloud. Please check back shortly for full details regarding <strong>{slug}</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20 max-w-4xl space-y-12">
      <h1 className="text-6xl font-black tracking-tight aura-text">{page.title}</h1>
      <div 
        className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
