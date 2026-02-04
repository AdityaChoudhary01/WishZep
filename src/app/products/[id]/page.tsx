
"use client";

import { useParams } from 'next/navigation';
import { useState } from 'react';
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
  const isApparel = product?.category === 'Apparel';
  const availableSizes = product?.sizes || [];

  const handleAddToCart = () => {
    if (!product) return;
    if (isApparel && availableSizes.length > 0 && !selectedSize) {
      toast({ variant: "destructive", title: "Size Required", description: "Please select a size to continue." });
      return;
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
    
    toast({
      title: "Added to Bag!",
      description: `${quantity}x ${product.name} ${selectedSize ? `(${selectedSize})` : ''} has been added.`,
    });
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
      // If sharing fails (e.g. permission denied), fallback to clipboard
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

  if (!product) return <div className="p-20 text-center">Product not found.</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-8">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
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
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">Verified Artifact</Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">4.9</span>
                <span className="text-xs text-muted-foreground">(Featured Drop)</span>
              </div>
            </div>
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-5xl font-black tracking-tight leading-tight flex-1">{product.name}</h1>
            </div>
            <div className="flex items-baseline gap-4">
              {product.discountPrice > 0 ? (
                <>
                  <span className="text-2xl text-muted-foreground line-through decoration-muted-foreground/60">Rs.{product.price.toLocaleString()}</span>
                  <span className="text-4xl font-black text-primary">Rs.{product.discountPrice.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-4xl font-black text-primary">Rs.{product.price.toLocaleString()}</span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed text-lg italic">
            {product.description}
          </p>

          <Separator className="border-white/20" />

          {/* Conditional Size Selector for Apparel */}
          {isApparel && availableSizes.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold uppercase tracking-widest text-primary">Select Size</label>
                {product.sizeChartUrl && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-xs font-bold underline flex items-center gap-1 hover:text-primary transition-colors">
                        <TableIcon className="w-3 h-3" /> Size Chart
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass max-w-2xl">
                      <DialogHeader><DialogTitle>Size Chart</DialogTitle></DialogHeader>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden mt-4">
                        <Image src={product.sizeChartUrl} alt="Size Chart" fill className="object-contain" />
                      </div>
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
                      "min-w-[60px] h-14 rounded-2xl border-2 font-black transition-all text-lg",
                      selectedSize === size 
                        ? "border-primary bg-primary text-white shadow-xl shadow-primary/20 scale-110" 
                        : "border-white/20 glass hover:border-primary/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex items-center glass rounded-2xl h-16 px-4">
              <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-2 hover:text-primary"><Minus className="w-4 h-4" /></button>
              <span className="w-12 text-center font-black text-xl">{quantity}</span>
              <button onClick={() => setQuantity(q => q+1)} className="p-2 hover:text-primary"><Plus className="w-4 h-4" /></button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={product.inventory === 0}
              className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-black gap-3 shadow-2xl shadow-primary/20"
            >
              <ShoppingBag className="w-6 h-6" /> {product.inventory === 0 ? 'Out of Stock' : 'Add to Bag'}
            </Button>
          </div>

          {/* Specifications Accordion (Flipkart Style) */}
          <Accordion type="single" collapsible className="w-full glass rounded-[2rem] px-6 overflow-hidden">
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <AccordionItem value="specs" className="border-white/10">
                <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-6">
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-primary" /> Specifications
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex border-b border-white/5 py-3 last:border-0">
                        <span className="w-32 text-xs font-bold uppercase text-muted-foreground">{key}</span>
                        <span className="text-sm font-medium">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="shipping" className="border-white/10">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-6">
                 <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-primary" /> Delivery Policy
                  </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                Global express transit. 2-5 business days delivery window. Zero exchange policy enforced for all WishZep artifacts.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-5 rounded-3xl flex items-center gap-4 border-l-4 border-primary">
              <Zap className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs font-black uppercase">Rapid Drop</p>
                <p className="text-[10px] text-muted-foreground">Arrives in 48 hours</p>
              </div>
            </div>
            <div className="glass p-5 rounded-3xl flex items-center gap-4 border-l-4 border-secondary">
              <ShieldCheck className="w-6 h-6 text-secondary" />
              <div>
                <p className="text-xs font-black uppercase">Elite Guard</p>
                <p className="text-[10px] text-muted-foreground">Safe Passage Warranty</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
