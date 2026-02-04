
"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ShoppingBag, X } from 'lucide-react';
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

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const addItem = useCartStore((state) => state.addItem);

  const searchParam = searchParams.get('search')?.toLowerCase() || '';
  const collectionParam = searchParams.get('collection')?.toLowerCase() || '';
  const categoryParam = searchParams.get('category') || 'All';
  const sortParam = searchParams.get('sort') || 'recommended';
  
  const categories = ['All', 'Footwear', 'Audio', 'Tech', 'Apparel', 'Accessories'];

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    // We fetch everything and sort/filter in memory for a better client-side UX
    // In a massive production app, we'd use Firestore's native where/orderBy
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);

  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];
    
    // 1. Filter
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

    // 2. Sort
    switch (sortParam) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Handle potential missing timestamps
        result.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        break;
      default:
        // Default 'recommended' sort (already sorted by name from query)
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
      image: product.imageUrl,
      category: product.category,
      description: product.description,
      rating: product.rating || 4.5
    });
    toast({
      title: "Added to Bag!",
      description: `${product.name} has been added to your WishZep collection.`,
    });
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

      {/* Active Filter Indicators */}
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
                  <p className="text-2xl font-black text-primary">${p.price}</p>
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
