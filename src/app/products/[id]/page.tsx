"use client";

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Heart, Star, ShieldCheck, Zap, Truck, ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCartStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const db = useFirestore();
  const addItem = useCartStore((state) => state.addItem);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Default');

  const productRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'products', id as string);
  }, [db, id]);

  const { data: product, isLoading } = useDoc(productRef);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Logic to handle quantity
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.imageUrl,
        category: product.category,
        description: product.description,
        rating: 4.9 // Placeholder rating
      }, selectedSize, selectedColor);
    }
    
    toast({
      title: "Added to Bag!",
      description: `${quantity}x ${product.name} (${selectedSize}) has been added.`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <Skeleton className="aspect-[4/5] rounded-[2.5rem]" />
        <div className="space-y-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-16 w-1/3" />
            <Skeleton className="h-16 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="p-20 text-center">Product not found.</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <Link href="/products" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Collection
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Image */}
        <div className="space-y-6">
          <div className="relative aspect-[4/5] glass rounded-[2.5rem] overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">In Stock</Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">4.9</span>
                <span className="text-xs text-muted-foreground">(142 reviews)</span>
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tight">{product.name}</h1>
            <p className="text-3xl font-black text-primary">${product.price}.00</p>
          </div>

          <p className="text-muted-foreground leading-relaxed text-lg">
            {product.description}
          </p>

          {product.attributes && (
             <div className="p-4 glass rounded-2xl">
               <p className="text-sm font-bold uppercase tracking-widest mb-1 text-primary">Aura Attributes</p>
               <p className="text-sm italic">"{product.attributes}"</p>
             </div>
          )}

          <Separator className="border-white/20" />

          {/* Variants */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-bold uppercase tracking-widest">Select Size</label>
                <button className="text-xs text-primary font-bold underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {['S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[50px] h-12 rounded-xl border-2 font-bold transition-all ${selectedSize === size ? 'border-primary bg-primary text-white shadow-lg' : 'border-white/20 glass hover:border-primary/50'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <div className="flex items-center glass rounded-2xl h-16 px-4">
              <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="p-2 hover:text-primary"><Minus className="w-4 h-4" /></button>
              <span className="w-12 text-center font-bold text-lg">{quantity}</span>
              <button onClick={() => setQuantity(q => q+1)} className="p-2 hover:text-primary"><Plus className="w-4 h-4" /></button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={product.inventory === 0}
              className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-bold gap-3 shadow-2xl shadow-primary/20"
            >
              <ShoppingBag className="w-6 h-6" /> {product.inventory === 0 ? 'Out of Stock' : 'Add to Bag'}
            </Button>
            <Button variant="outline" className="h-16 w-16 rounded-2xl glass hover:text-red-500">
              <Heart className="w-6 h-6" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-2xl flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase">Free Shipping</p>
                <p className="text-[10px] text-muted-foreground">On orders over $150</p>
              </div>
            </div>
            <div className="glass p-4 rounded-2xl flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-xs font-bold uppercase">Safe Warranty</p>
                <p className="text-[10px] text-muted-foreground">365 days coverage</p>
              </div>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features" className="border-white/20">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-4">Features</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{product.description}</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping" className="border-white/20">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-4">Shipping & Delivery</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer worldwide express shipping for all high-performance gear. Please note that all WishZep sales are final to maintain the exclusivity of our drops. We do not offer returns or exchanges.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
