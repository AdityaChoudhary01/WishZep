
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
  
  const categories = ['All', 'Footwear', 'Audio', 'Tech', 'Apparel', 'Accessories'];

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);

  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((p) => {
      // Partial string matching across multiple fields
      const matchesSearch = !searchParam || [
        p.name,
        p.category,
        p.description,
        p.attributes
      ].some(field => field?.toLowerCase().includes(searchParam));
      
      const matchesCategory = categoryParam === 'All' || p.category === categoryParam;

      // Handle special collection filters from home/collections pages
      const normalizedCollection = collectionParam.replace(/-/g, ' ');
      const matchesCollection = !collectionParam || 
        p.category?.toLowerCase() === collectionParam ||
        p.category?.toLowerCase() === normalizedCollection ||
        p.name?.toLowerCase().includes(collectionParam) ||
        p.name?.toLowerCase().includes(normalizedCollection);
      
      return matchesSearch && matchesCategory && matchesCollection;
    });
  }, [products, searchParam, categoryParam, collectionParam]);

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === 'All') {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
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

  const clearFilters = () => {
    router.push('/products');
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
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass gap-2 rounded-full w-full md:w-auto">
                Sort By: Recommended <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass">
              <DropdownMenuItem>Price: Low to High</DropdownMenuItem>
              <DropdownMenuItem>Price: High to Low</DropdownMenuItem>
              <DropdownMenuItem>Newest First</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(searchParam || collectionParam || categoryParam !== 'All') && (
        <div className="flex items-center gap-4 animate-fade-in bg-white/10 p-4 rounded-2xl border border-white/20">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Filters:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {searchParam && <Badge className="bg-primary text-white px-4 py-1 rounded-full">Search: "{searchParam}"</Badge>}
            {collectionParam && <Badge className="bg-secondary text-white px-4 py-1 rounded-full">Collection: {collectionParam}</Badge>}
            {categoryParam !== 'All' && <Badge className="bg-accent text-white px-4 py-1 rounded-full">{categoryParam}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive">
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
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((p) => (
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
          <Button variant="default" size="lg" onClick={clearFilters} className="rounded-full px-10">
            Browse All Products
          </Button>
        </div>
      )}
    </div>
  );
}
