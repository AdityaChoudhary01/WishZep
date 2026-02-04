
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

export default function ProductDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Purple');

  // Simulated product fetching
  const product = {
    id: id as string,
    name: 'Neo-Stomp Tech Sneakers',
    price: 189,
    description: 'Engineered for the urban explorer, the Neo-Stomp combines cutting-edge techwear aesthetics with unmatched comfort. Featuring a responsive foam core and a high-traction glass-reinforced outsole.',
    images: [
      'https://picsum.photos/seed/wishzep-p1/800/1000',
      'https://picsum.photos/seed/wishzep-p1b/800/1000',
      'https://picsum.photos/seed/wishzep-p1c/800/1000',
    ],
    rating: 4.9,
    reviews: 142,
    variants: {
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Purple', hex: '#BE29EC' },
        { name: 'Blue', hex: '#29A6EC' },
        { name: 'Black', hex: '#111111' },
      ]
    },
    features: [
      'Water-resistant mesh upper',
      'Aura-Glow reflective accents',
      'Advanced shock absorption',
      'Recycled composite materials'
    ]
  };

  const [mainImage, setMainImage] = useState(product.images[0]);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      category: 'Footwear',
      description: product.description,
      rating: product.rating
    }, selectedSize, selectedColor);
    
    toast({
      title: "Added to Bag!",
      description: `${product.name} (${selectedSize}, ${selectedColor}) has been added.`,
    });
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <Link href="/products" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Collection
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Images */}
        <div className="space-y-6">
          <div className="relative aspect-[4/5] glass rounded-[2.5rem] overflow-hidden">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setMainImage(img)}
                className={`relative aspect-square rounded-2xl overflow-hidden glass transition-all ${mainImage === img ? 'ring-2 ring-primary ring-offset-4' : 'opacity-60 hover:opacity-100'}`}
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
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">New Arrival</Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-bold">{product.rating}</span>
                <span className="text-xs text-muted-foreground">({product.reviews} reviews)</span>
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tight">{product.name}</h1>
            <p className="text-3xl font-black text-primary">${product.price}.00</p>
          </div>

          <p className="text-muted-foreground leading-relaxed text-lg">
            {product.description}
          </p>

          <Separator className="border-white/20" />

          {/* Variants */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-widest">Select Color</label>
              <div className="flex gap-4">
                {product.variants.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-10 h-10 rounded-full border-4 transition-all ${selectedColor === color.name ? 'border-primary scale-110 shadow-lg' : 'border-transparent'}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-bold uppercase tracking-widest">Select Size</label>
                <button className="text-xs text-primary font-bold underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.variants.sizes.map((size) => (
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
              className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-bold gap-3 shadow-2xl shadow-primary/20"
            >
              <ShoppingBag className="w-6 h-6" /> Add to Bag
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
                <ul className="space-y-2 list-disc pl-4 text-muted-foreground">
                  {product.features.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping" className="border-white/20">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-4">Shipping & Returns</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We offer worldwide express shipping. All products can be returned within 30 days of purchase in original condition.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care" className="border-white/20">
              <AccordionTrigger className="text-sm font-bold uppercase tracking-widest hover:no-underline py-4">Care Instructions</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Wipe clean with a damp cloth. Avoid direct exposure to prolonged sunlight to preserve Aura-Glow finishes.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
