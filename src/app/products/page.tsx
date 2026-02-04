
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ShoppingBag, X, Share2, ChevronLeft, ChevronRight, Star } from 'lucide-react';
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

const ITEMS_PER_PAGE = 12;

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
  
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch categories
  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: manualCategories } = useCollection(categoriesQuery);

  // Fetch products
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  // Extract unique categories
  const categories = useMemo(() => {
    const manualNames = manualCategories?.map(c => c.name) || [];
    const productCats = products?.map(p => p.category).filter(Boolean) || [];
    const unique = Array.from(new Set(['All', ...manualNames, ...productCats])).sort();
    return unique;
  }, [manualCategories, products]);

  // Filter and sort products
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

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParam, collectionParam, categoryParam, sortParam]);

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
    e.stopPropagation();
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
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">WISHZEP <span className="wishzep-text">CATALOGUE</span></h1>
        <p className="text-muted-foreground text-sm md:text-lg max-w-2xl">
          High-performance gear curated for the modern visionary. Explore the full WishZep lineup.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 border-b border-white/20 pb-6 md:pb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryParam === cat ? 'default' : 'outline'}
              className={cn(
                "rounded-full px-4 md:px-6 h-10 md:h-12 text-[10px] md:text-sm transition-all font-bold",
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
              <Button variant="outline" className="glass gap-2 rounded-full w-full md:w-auto min-w-[180px] justify-between h-10 md:h-12">
                <span className="text-xs md:text-sm">Sort: {getSortLabel()}</span> <ChevronDown className="w-4 h-4" />
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
        <div className="flex items-center gap-3 animate-fade-in bg-white/10 p-3 rounded-2xl border border-white/20 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Filters:</span>
          <div className="flex gap-2 flex-1">
            {searchParam && <Badge className="bg-primary text-white px-3 py-0.5 rounded-full whitespace-nowrap text-[9px]">"{searchParam}"</Badge>}
            {collectionParam && <Badge className="bg-secondary text-white px-3 py-0.5 rounded-full whitespace-nowrap text-[9px]">{collectionParam}</Badge>}
            {categoryParam !== 'All' && <Badge className="bg-accent text-white px-3 py-0.5 rounded-full whitespace-nowrap text-[9px]">{categoryParam}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/products')} className="h-7 rounded-lg gap-2 hover:bg-destructive/10 hover:text-destructive shrink-0 text-[10px]">
            <X className="w-3 h-3" /> Reset
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/5] rounded-[1.5rem] md:rounded-[2.5rem]" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : paginatedProducts.length > 0 ? (
        <div className="space-y-12 md:space-y-16">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
            {paginatedProducts.map((p) => (
              <Link href={`/products/${p.id}`} key={p.id} className="group">
                <div className="glass rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-3 space-y-2 md:space-y-4 transition-all hover:shadow-2xl hover:shadow-primary/5">
                  <div className="relative aspect-[4/5] rounded-[1.2rem] md:rounded-[1.5rem] overflow-hidden bg-muted">
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {p.inventory <= 5 && p.inventory > 0 && (
                      <Badge className="absolute top-2 left-2 bg-orange-500 text-white font-black text-[7px] md:text-[10px] px-1.5 py-0.5 rounded-sm">
                        LOW STOCK
                      </Badge>
                    )}
                    {p.inventory === 0 && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white font-black text-[7px] md:text-[10px] px-1.5 py-0.5 rounded-sm">
                        SOLD OUT
                      </Badge>
                    )}
                    
                    <button 
                      onClick={(e) => handleShare(e, p)}
                      className="absolute top-2 right-2 w-7 h-7 md:w-10 md:h-10 rounded-full glass flex items-center justify-center hover:bg-primary hover:text-white transition-all z-10"
                    >
                      <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 p-1.5 md:p-4 bg-gradient-to-t from-black/70 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <Button 
                        disabled={p.inventory === 0}
                        onClick={(e) => handleQuickAdd(e, p)} 
                        className="w-full bg-white text-black hover:bg-white/90 rounded-md md:rounded-xl gap-2 h-8 md:h-12 text-[10px] md:text-sm font-bold"
                      >
                        <ShoppingBag className="w-3 h-3 md:w-4 md:h-4" /> Quick Add
                      </Button>
                    </div>
                  </div>
                  <div className="px-1 md:px-2 pb-2 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-xs md:text-lg group-hover:text-primary transition-colors truncate">{p.name}</h3>
                        <p className="text-[8px] md:text-[11px] text-muted-foreground font-black uppercase tracking-widest leading-tight">{p.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-2 h-2 md:w-3 md:h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-[7px] md:text-[9px] font-bold text-muted-foreground uppercase">Verified Artifact</span>
                    </div>

                    <div className="pt-1">
                      {p.discountPrice && p.discountPrice > 0 ? (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <p className="text-sm md:text-xl font-black text-primary">Rs.{p.discountPrice.toLocaleString()}</p>
                          <span className="text-[8px] md:text-[12px] text-muted-foreground line-through decoration-muted-foreground/50">Rs.{p.price.toLocaleString()}</span>
                          <span className="text-[8px] md:text-[10px] text-green-500 font-bold">
                            {Math.round(((p.price - p.discountPrice) / p.price) * 100)}% OFF
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm md:text-xl font-black text-primary">Rs.{p.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 md:gap-4 py-8">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl glass h-10 w-10 md:h-12 md:w-12"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              
              <div className="flex items-center gap-1.5 md:gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? 'default' : 'ghost'}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-xl text-xs md:text-sm font-black",
                      currentPage === i + 1 ? "shadow-lg shadow-primary/20" : "glass"
                    )}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="rounded-xl glass h-10 w-10 md:h-12 md:w-12"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 text-center space-y-6 glass rounded-[2.5rem] md:rounded-[3rem] animate-fade-in mx-auto max-w-lg">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black">No artifacts found</h2>
            <p className="text-muted-foreground text-sm">We couldn't find anything matching your filters.</p>
          </div>
          <Button variant="default" size="lg" onClick={() => router.push('/products')} className="rounded-full px-10 h-14 font-black">
            Reset All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-20 text-center animate-pulse">Loading catalogue...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
