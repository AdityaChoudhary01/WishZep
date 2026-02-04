
"use client";

import { useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ShoppingBag, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const addItem = useCartStore((state) => state.addItem);

  const searchParam = searchParams.get('search')?.toLowerCase() || '';
  const collectionParam = searchParams.get('collection')?.toLowerCase() || '';
  const categoryParam = searchParams.get('category') || 'All';
  const sortParam = searchParams.get('sort') || 'recommended';
  
  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: manualCategories } = useCollection(categoriesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const categories = useMemo(() => {
    const manualNames = manualCategories?.map(c => c.name) || [];
    const productCats = products?.map(p => p.category).filter(Boolean) || [];
    const unique = Array.from(new Set(['All', ...manualNames, ...productCats])).sort();
    return unique;
  }, [manualCategories, products]);

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];
    
    let result = products.filter((p) => {
      const matchesSearch = !searchParam || [
        p.name,
        p.category,
        p.description,
        p.attributes
      ].some(field => field?.toLowerCase().includes(searchParam));
      
      const matchesCategory = categoryParam === 'All' || p.category === categoryParam;

      const normalizedCollection = collectionParam.replace(/-/g, ' ');
      const matchesCollection = !collectionParam || 
        p.category?.toLowerCase() === collectionParam ||
        p.category?.toLowerCase() === normalizedCollection ||
        p.name?.toLowerCase().includes(collectionParam) ||
        p.name?.toLowerCase().includes(normalizedCollection);
      
      return matchesSearch && matchesCategory && matchesCollection;
    });

    switch (sortParam) {
      case 'price-low':
        result.sort((a, b) => {
          const priceA = a.discountPrice && a.discountPrice > 0 ? a.discountPrice : a.price;
          const priceB = b.discountPrice && b.discountPrice > 0 ? b.discountPrice : b.price;
          return priceA - priceB;
        });
        break;
      case 'price-high':
        result.sort((a, b) => {
          const priceA = a.discountPrice && a.discountPrice > 0 ? a.discountPrice : a.price;
          const priceB = b.discountPrice && b.discountPrice > 0 ? b.discountPrice : b.price;
          return priceB - priceA;
        });
        break;
      case 'newest':
        result.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        break;
      default:
        break;
    }

    return result;
  }, [products, searchParam, categoryParam, collectionParam, sortParam]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === 'All' || value === 'recommended') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/products?${params.toString()}`);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      image: product.imageUrl,
      category: product.category,
      description: product.description,
      rating: product.rating || 4.5
    });
    toast({
      title: "Added to Bag!",
      description: `${product.name} has been added to your collection.`,
    });
  };

  const handleShare = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareData = {
      title: product.name,
      text: `Check out this ${product.name} on WishZep!`,
      url: window.location.origin + `/products/${product.id}`,
    };

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied! 🔗",
          description: "Product link copied to your clipboard.",
        });
      } catch (err) {
        console.error('Clipboard failed:', err);
      }
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard();
      }
    } catch (err) {
      // Fallback to clipboard on any error (like permission denied)
      await copyToClipboard();
    }
  };

  const getSortLabel = () => {
    switch (sortParam) {
      case 'price-low': return 'Price: Low to High';
      case 'price-high': return 'Price: High to Low';
      case 'newest': return 'Newest First';
      default: return 'Recommended';
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 space-y-12">
      <div className="space-y-6">
        <h1 className="text-5xl font-black tracking-tighter">WISHZEP <span className="wishzep-text">CATALOGUE</span></h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          High-performance gear curated for the modern visionary. Explore the full WishZep lineup.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/20 pb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryParam === cat ? 'default' : 'outline'}
              className={cn(
                "rounded-full px-6 transition-all",
                categoryParam === cat ? "shadow-lg shadow-primary/30" : "glass"
              )}
              onClick={() => updateParams({ category: cat })}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass gap-2 rounded-full w-full md:w-auto min-w-[200px] justify-between">
                <span>Sort By: {getSortLabel()}</span> <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass min-w-[200px]">
              <DropdownMenuItem onClick={() => updateParams({ sort: 'recommended' })}>
                Recommended
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateParams({ sort: 'price-low' })}>
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateParams({ sort: 'price-high' })}>
                Price: High to Low
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateParams({ sort: 'newest' })}>
                Newest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(searchParam || collectionParam || categoryParam !== 'All' || sortParam !== 'recommended') && (
        <div className="flex items-center gap-4 animate-fade-in bg-white/10 p-4 rounded-2xl border border-white/20">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Filters:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {searchParam && <Badge className="bg-primary text-white px-4 py-1 rounded-full">Search: "{searchParam}"</Badge>}
            {collectionParam && <Badge className="bg-secondary text-white px-4 py-1 rounded-full">Collection: {collectionParam}</Badge>}
            {categoryParam !== 'All' && <Badge className="bg-accent text-white px-4 py-1 rounded-full">{categoryParam}</Badge>}
            {sortParam !== 'recommended' && <Badge variant="outline" className="glass px-4 py-1 rounded-full">{getSortLabel()}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/products')} className="h-9 rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive">
            <X className="w-4 h-4" /> Reset All
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/5] rounded-[2.5rem]" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredAndSortedProducts.map((p) => (
            <Link href={`/products/${p.id}`} key={p.id} className="group">
              <div className="glass rounded-[2rem] p-3 space-y-4 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/5">
                <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-muted">
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {p.inventory <= 5 && p.inventory > 0 && (
                    <Badge className="absolute top-4 left-4 bg-orange-500 text-white font-bold px-3 py-1">
                      Low Stock
                    </Badge>
                  )}
                  {p.inventory === 0 && (
                    <Badge className="absolute top-4 left-4 bg-red-500 text-white font-bold px-3 py-1">
                      Out of Stock
                    </Badge>
                  )}
                  
                  {/* Share Icon */}
                  <button 
                    onClick={(e) => handleShare(e, p)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary hover:text-white transition-all z-10"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <Button 
                      disabled={p.inventory === 0}
                      onClick={(e) => handleQuickAdd(e, p)} 
                      className="w-full bg-white text-black hover:bg-white/90 rounded-xl gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" /> Quick Add
                    </Button>
                  </div>
                </div>
                <div className="px-2 pb-2 flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">{p.category}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    {p.discountPrice && p.discountPrice > 0 ? (
                      <>
                        <span className="text-[10px] text-muted-foreground line-through decoration-muted-foreground/50">Rs.{p.price.toLocaleString()}</span>
                        <p className="text-xl font-black text-primary">Rs.{p.discountPrice.toLocaleString()}</p>
                      </>
                    ) : (
                      <p className="text-xl font-black text-primary">Rs.{p.price.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-6 glass rounded-[3rem] animate-fade-in">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <X className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black">No WishZep Gear Found</h2>
            <p className="text-muted-foreground text-lg">We couldn't find anything matching your current filters.</p>
          </div>
          <Button variant="default" size="lg" onClick={() => router.push('/products')} className="rounded-full px-10">
            Browse All Products
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-20 text-center animate-pulse">Loading experience...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
