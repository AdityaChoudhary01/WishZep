
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
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
  Share2
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

  const allImages = product ? [product.imageUrl, ...(product.images || [])] : [];
  
  // Consistent apparel detection logic
  const isApparel = useMemo(() => {
    if (!product?.category) return false;
    const cat = product.category.toLowerCase();
    const apparelKeywords = ['apparel', 'clothing', 'clothes', 'shirt', 'pant', 't-shirt', 'hoodie', 'bottoms', 'top', 'trousers', 'wear'];
    return apparelKeywords.some(keyword => cat.includes(keyword));
  }, [product?.category]);

  const availableSizes = product?.sizes || [];

  const handleAddToCart = (silent = false) => {
    if (!product) return false;
    if (isApparel && availableSizes.length > 0 && !selectedSize) {
      toast({ variant: "destructive", title: "Size Required", description: "Please select a size to continue." });
      return false;
    }
    
    for (let i = 0; i < quantity; i++) {
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
        title: "Added to Bag!",
        description: `${quantity}x ${product.name} ${selectedSize ? `(${selectedSize})` : ''} has been added.`,
      });
    }
    return true;
  };

  const handleBuyNow = () => {
    const success = handleAddToCart(true);
    if (success) {
      router.push('/cart');
    }
  };

  const handleShare = async () => {
    if (!product) return;
    
    const shareData = {
      title: product.name,
      text: `Check out this ${product.name} on WishZep!`,
      url: window.location.href,
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <Skeleton className="aspect-[4/5] rounded-[2.5rem]" />
        <div className="space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!product) return <div className="p-20 text-center font-bold">Product not found.</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-8">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Collection
        </Link>
        <Button variant="ghost" size="icon" className="rounded-full glass" onClick={handleShare}>
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Media Gallery */}
        <div className="space-y-6">
          <div className="relative aspect-[4/5] glass rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <Image
              src={allImages[activeImageIdx]}
              alt={product.name}
              fill
              className="object-cover transition-all duration-700 group-hover:scale-105"
              priority
            />
            {allImages.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="rounded-full bg-white/20 backdrop-blur-md" onClick={() => setActiveImageIdx(p => (p - 1 + allImages.length) % allImages.length)}>
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button size="icon" variant="ghost" className="rounded-full bg-white/20 backdrop-blur-md" onClick={() => setActiveImageIdx(p => (p + 1) % allImages.length)}>
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {allImages.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImageIdx(i)}
                className={cn(
                  "relative w-24 h-24 rounded-2xl overflow-hidden glass shrink-0 transition-all border-2",
                  activeImageIdx === i ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <Image src={img} alt={`Thumb ${i}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px]">Verified Artifact</Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-black">4.9</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase ml-1">(Top Choice)</span>
              </div>
            </div>
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-5xl font-black tracking-tighter leading-none">{product.name}</h1>
            </div>
            <div className="flex items-baseline gap-4">
              {product.discountPrice > 0 ? (
                <>
                  <span className="text-2xl text-muted-foreground line-through decoration-muted-foreground/60 font-bold">Rs.{product.price.toLocaleString()}</span>
                  <span className="text-5xl font-black text-primary wishzep-text">Rs.{product.discountPrice.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-5xl font-black text-primary wishzep-text">Rs.{product.price.toLocaleString()}</span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed text-lg font-light">
            {product.description}
          </p>

          <Separator className="border-white/20" />

          {/* Conditional Size Selector for Apparel */}
          {isApparel && availableSizes.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Choose your fit</label>
                {product.sizeChartUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-primary transition-colors glass px-3 py-1.5 rounded-full border border-primary/20">
                        <TableIcon className="w-3.5 h-3.5" /> View Size Chart
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass max-w-3xl border-white/30 rounded-[2.5rem] p-8">
                      <DialogHeader><DialogTitle className="text-2xl font-black">Size Guide</DialogTitle></DialogHeader>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden mt-6 bg-white/10">
                        <Image src={product.sizeChartUrl} alt="Size Chart" fill className="object-contain" />
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-4 font-bold uppercase tracking-widest">Measure carefully for the perfect WishZep frequency.</p>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {availableSizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "min-w-[65px] h-16 rounded-2xl border-2 font-black transition-all text-xl flex items-center justify-center",
                      selectedSize === size 
                        ? "border-primary bg-primary text-white shadow-xl shadow-primary/30 scale-105" 
                        : "border-white/20 glass hover:border-primary/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="flex items-center glass rounded-2xl h-16 px-4 w-fit mx-auto sm:mx-0 border border-white/20">
              <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-2 hover:text-primary transition-colors"><Minus className="w-5 h-5" /></button>
              <span className="w-12 text-center font-black text-2xl">{quantity}</span>
              <button onClick={() => setQuantity(q => q+1)} className="p-2 hover:text-primary transition-colors"><Plus className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleAddToCart(false)}
                disabled={product.inventory === 0}
                className="flex-1 h-16 rounded-2xl glass border-primary/40 text-lg font-black gap-2 hover:bg-primary/5 transition-all"
              >
                <ShoppingBag className="w-6 h-6" /> Add to Bag
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={product.inventory === 0}
                className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-black gap-2 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]"
              >
                <Zap className="w-6 h-6 fill-white" /> Buy Now
              </Button>
            </div>
          </div>

          {/* Specifications Accordion */}
          <Accordion type="single" collapsible className="w-full glass rounded-[2.5rem] px-8 overflow-hidden border border-white/20 mt-8">
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <AccordionItem value="specs" className="border-white/10">
                <AccordionTrigger className="text-xs font-black uppercase tracking-[0.2em] hover:no-underline py-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Info className="w-4 h-4" /></div>
                    Specifications
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-0 pb-6 border-t border-white/5 mt-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex border-b border-white/5 py-4 last:border-0 hover:bg-white/5 transition-colors px-2">
                        <span className="w-40 text-[10px] font-black uppercase text-primary/70 tracking-widest">{key}</span>
                        <span className="text-sm font-bold">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="shipping" className="border-white/10">
              <AccordionTrigger className="text-xs font-black uppercase tracking-[0.2em] hover:no-underline py-8">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary"><Truck className="w-4 h-4" /></div>
                    Delivery Policy
                  </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-8 leading-relaxed font-medium px-2">
                Every WishZep artifact is dispatched within 24 hours via Global Express. Expected arrival window is 2-5 business days. Due to the high-velocity drop model, all sales are final.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="glass p-6 rounded-3xl flex items-center gap-4 border-l-4 border-primary bg-primary/5">
              <Zap className="w-7 h-7 text-primary" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Rapid Drop</p>
                <p className="text-xs font-bold">48hr Secure Transit</p>
              </div>
            </div>
            <div className="glass p-6 rounded-3xl flex items-center gap-4 border-l-4 border-secondary bg-secondary/5">
              <ShieldCheck className="w-7 h-7 text-secondary" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Elite Guard</p>
                <p className="text-xs font-bold">Safe Passage Warranty</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
