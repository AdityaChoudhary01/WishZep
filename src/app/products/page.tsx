
"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Filter, ChevronDown, Star, ShoppingBag, LayoutGrid, List } from 'lucide-react';
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
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { toast } = useToast();
  const addItem = useCartStore((state) => state.addItem);

  const searchParam = searchParams.get('search')?.toLowerCase() || '';
  const collectionParam = searchParams.get('collection') || '';
  
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Footwear', 'Audio', 'Tech', 'Apparel', 'Accessories'];

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);

  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchParam) || 
        p.category.toLowerCase().includes(searchParam) ||
        p.description?.toLowerCase().includes(searchParam);
      
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      
      // Collection filter logic could be added here if backend.json supported it better, 
      // but for now we filter by text search or category.
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchParam, activeCategory]);

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
      description: `${product.name} has been added.`,
    });
  };

  return (
    <div className="container mx-auto px-6 py-12 space-y-12">
      <div className="space-y-6">
        <h1 className="text-5xl font-black tracking-tighter">OUR <span className="aura-text">CATALOGUE</span></h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Carefully selected gear to elevate your performance and style. Browse our latest arrivals and timeless classics.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/20 pb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              className={cn(
                "rounded-full px-6 transition-all",
                activeCategory === cat ? "shadow-lg shadow-primary/30" : "glass"
              )}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass gap-2 rounded-full w-full md:w-auto">
                Sort By: Newest <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass">
              <DropdownMenuItem>Price: Low to High</DropdownMenuItem>
              <DropdownMenuItem>Price: High to Low</DropdownMenuItem>
              <DropdownMenuItem>Most Popular</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden md:flex glass rounded-full p-1">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm"><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full"><List className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/5] rounded-[2rem]" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : (
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
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">{p.rating || 4.5}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-primary">${p.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && filteredProducts.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <p className="text-2xl font-bold">No products found for "{searchParam || activeCategory}".</p>
          <Button variant="default" onClick={() => setActiveCategory('All')}>Browse All Products</Button>
        </div>
      )}
    </div>
  );
}
