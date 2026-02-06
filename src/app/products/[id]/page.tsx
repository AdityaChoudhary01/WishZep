"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Heart, 
  Star, 
  ShieldCheck, 
  Zap, 
  Truck, 
  ArrowLeft, 
  Plus, 
  Minus,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Share2,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = useFirestore();
  const addItem = useCartStore((state) => state.addItem);
   
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const productRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'products', id as string);
  }, [db, id]);

  const { data: product, isLoading } = useDoc(productRef);

  const allImages = useMemo(() => {
    if (!product) return [];
    return [product.imageUrl, ...(product.images || [])].filter(Boolean);
  }, [product]);
   
  const isApparel = useMemo(() => {
    if (!product?.category) return false;
    const cat = product.category.toLowerCase();
    const apparelKeywords = ['apparel', 'clothing', 'clothes', 'shirt', 'hoodie', 'bottoms', 'wear', 't-shirt', 'jacket'];
    return apparelKeywords.some(keyword => cat.includes(keyword));
  }, [product?.category]);

  const availableSizes = product?.sizes || [];

  const handleAddToCart = (silent = false) => {
    if (!product) return false;
    if (isApparel && availableSizes.length > 0 && !selectedSize) {
      toast({ variant: "destructive", title: "Select Size", description: "Please select a size before adding to cart." });
      return false;
    }
    
    for(let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        image: product.imageUrl,
        category: product.category,
        description: product.description,
        rating: 4.9 
      }, selectedSize);
    }
    
    if (!silent) {
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your shopping bag.`,
      });
    }
    return true;
  };

  const handleBuyNow = () => {
    const success = handleAddToCart(true);
    if (success) router.push('/cart');
  };

  const handleShare = async () => {
    if (!product) return;
    
    const shareData = {
      title: product.name,
      text: `Check out the ${product.name} on WishZep!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied!", description: "Product link copied to clipboard." });
      }
    } catch (err) {
      // User cancelled or share failed
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        <Skeleton className="aspect-[4/5] rounded-3xl md:rounded-[3rem]" />
        <div className="space-y-6 md:space-y-10">
          <Skeleton className="h-12 md:h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-32 md:h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!product) return <div className="p-20 text-center font-black">PRODUCT NOT FOUND</div>;

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Header / Nav */}
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <Link href="/products" className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest hover:text-primary transition-all">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">BACK TO</span> ALL PRODUCTS
        </Link>
        <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full glass h-10 w-10 md:h-12 md:w-12 hover:text-primary">
          <Share2 className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        
        {/* --- Left Column: Images --- */}
        <div className="space-y-4 md:space-y-8">
          <div className="relative aspect-[4/5] glass rounded-3xl md:rounded-[3rem] overflow-hidden group shadow-2xl md:shadow-3xl">
            <Image 
              src={allImages[activeImageIdx]} 
              alt={product.name} 
              fill 
              className="object-cover transition-all duration-1000 group-hover:scale-105" 
              priority 
            />
            {allImages.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2 md:px-6 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all pointer-events-none">
                <Button size="icon" variant="ghost" className="rounded-full glass pointer-events-auto w-10 h-10 md:w-12 md:h-12" onClick={() => setActiveImageIdx(p => (p - 1 + allImages.length) % allImages.length)}>
                  <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
                </Button>
                <Button size="icon" variant="ghost" className="rounded-full glass pointer-events-auto w-10 h-10 md:w-12 md:h-12" onClick={() => setActiveImageIdx(p => (p + 1) % allImages.length)}>
                  <ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
                </Button>
              </div>
            )}
          </div>
          
          {allImages.length > 1 && (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-1">
              {allImages.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImageIdx(i)} 
                  className={cn(
                    "relative w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl overflow-hidden glass shrink-0 transition-all border-2 snap-center", 
                    activeImageIdx === i ? "border-primary scale-105 shadow-xl" : "border-transparent opacity-60"
                  )}
                >
                  <Image src={img} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- Right Column: Details & Actions --- */}
        <div className="space-y-8 md:space-y-10">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <Badge className="bg-primary/10 text-primary border-none px-3 py-1 md:px-4 md:py-1.5 font-black uppercase tracking-widest text-[8px] md:text-[10px]">WishZep Original</Badge>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xs md:text-sm font-black">4.9 / 5.0</span>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase break-words">{product.name}</h1>
            
            <div className="flex flex-wrap items-baseline gap-3 md:gap-6">
              {product.discountPrice > 0 ? (
                <>
                  <span className="text-xl md:text-3xl text-muted-foreground line-through decoration-muted-foreground/60 font-bold">Rs.{product.price.toLocaleString()}</span>
                  <span className="text-4xl md:text-6xl font-black wishzep-text">Rs.{product.discountPrice.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-4xl md:text-6xl font-black wishzep-text">Rs.{product.price.toLocaleString()}</span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed text-base md:text-xl font-light">{product.description}</p>

          <Separator className="bg-white/20" />

          {/* Size Selector */}
          {isApparel && availableSizes.length > 0 && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">SELECT SIZE</label>
                {product.sizeChartUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-primary transition-all glass px-3 py-2 md:px-5 md:py-2.5 rounded-full">
                        <TableIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> Size Guide
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass w-[95vw] max-w-4xl border-white/20 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10">
                      <DialogHeader><DialogTitle className="text-2xl md:text-3xl font-black uppercase">Size Chart</DialogTitle></DialogHeader>
                      <div className="relative aspect-video w-full rounded-2xl md:rounded-3xl overflow-hidden mt-4 md:mt-8 bg-white/5 border border-white/10">
                        <Image src={product.sizeChartUrl} alt="Size Guide" fill className="object-contain" />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-3 md:gap-4">
                {availableSizes.map((size: string) => (
                  <button 
                    key={size} 
                    onClick={() => setSelectedSize(size)} 
                    className={cn(
                      "h-14 md:h-20 min-w-[60px] md:min-w-[80px] rounded-xl md:rounded-2xl border-2 font-black transition-all text-lg md:text-2xl flex items-center justify-center", 
                      selectedSize === size ? "border-primary bg-primary text-white shadow-xl shadow-primary/30 scale-105" : "border-white/20 glass hover:border-primary/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-2 md:pt-6">
            <div className="flex items-center justify-between sm:justify-center glass rounded-xl md:rounded-2xl h-16 md:h-20 px-4 md:px-6 w-full sm:w-fit border border-white/20">
              <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-3 hover:text-primary transition-all"><Minus className="w-5 h-5 md:w-6 md:h-6" /></button>
              <span className="w-12 text-center font-black text-2xl md:text-3xl">{quantity}</span>
              <button onClick={() => setQuantity(q => q+1)} className="p-3 hover:text-primary transition-all"><Plus className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button 
                variant="outline" 
                onClick={() => handleAddToCart(false)} 
                disabled={product.inventory === 0} 
                className="flex-1 h-16 md:h-20 rounded-xl md:rounded-2xl glass border-primary/40 text-base md:text-lg font-black gap-2 md:gap-3 hover:bg-primary/5 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" /> ADD TO CART
              </Button>
              <Button 
                onClick={handleBuyNow} 
                disabled={product.inventory === 0} 
                className="flex-1 h-16 md:h-20 rounded-xl md:rounded-2xl bg-primary hover:bg-primary/90 text-lg md:text-xl font-black gap-2 md:gap-3 shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Zap className="w-6 h-6 md:w-7 md:h-7 fill-white" /> BUY NOW
              </Button>
            </div>
          </div>

          {/* Accordion Info */}
          <Accordion type="single" collapsible className="w-full glass rounded-[2rem] md:rounded-[3rem] px-6 md:px-10 border border-white/20 mt-8 md:mt-12 overflow-hidden">
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <AccordionItem value="specs" className="border-white/10">
                <AccordionTrigger className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] hover:no-underline py-6 md:py-10">
                  <div className="flex items-center gap-3 md:gap-4"><Settings2 className="w-4 h-4 md:w-5 md:h-5 text-primary" /> Product Specifications</div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-0 pb-6 md:pb-10 border-t border-white/5 mt-2 md:mt-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row border-b border-white/5 py-4 md:py-5 last:border-0 hover:bg-white/5 transition-all px-2 md:px-4 rounded-xl gap-1 sm:gap-0">
                        <span className="w-full sm:w-48 text-[10px] md:text-[11px] font-black uppercase text-primary/70 tracking-widest">{key}</span>
                        <span className="text-sm md:text-base font-bold text-foreground">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="logistics" className="border-white/10">
              <AccordionTrigger className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] hover:no-underline py-6 md:py-10">
                 <div className="flex items-center gap-3 md:gap-4"><Truck className="w-4 h-4 md:w-5 md:h-5 text-secondary" /> Shipping & Delivery</div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 md:pb-10 leading-relaxed font-medium px-2 md:px-4 text-sm md:text-base">
                Fast shipping guaranteed. Products are usually dispatched within 24-48 hours. Secure tracking link provided once shipped.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
