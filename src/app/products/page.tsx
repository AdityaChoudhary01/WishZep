
"use client";

import { useState } from 'react';
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

const PRODUCTS = [
  { id: '1', name: 'Neo-Stomp Tech Sneakers', price: 189, image: 'https://picsum.photos/seed/wishzep-p1/800/800', category: 'Footwear', badge: 'Popular' },
  { id: '2', name: 'SonicWave Elite Pro', price: 249, image: 'https://picsum.photos/seed/wishzep-p2/800/800', category: 'Audio', badge: 'New' },
  { id: '3', name: 'Zenith Glass Smartwatch', price: 329, image: 'https://picsum.photos/seed/wishzep-p3/800/800', category: 'Tech', badge: 'Limited' },
  { id: '4', name: 'Nomad X Carbon Backpack', price: 159, image: 'https://picsum.photos/seed/wishzep-p4/800/800', category: 'Accessories' },
  { id: '5', name: 'TitanShell Hardshell Jacket', price: 420, image: 'https://picsum.photos/seed/wishzep-p5/800/800', category: 'Apparel', badge: 'Sale' },
  { id: '6', name: 'RGB Nexus Mechanical Key', price: 199, image: 'https://picsum.photos/seed/wishzep-p6/800/800', category: 'Tech' },
];

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Footwear', 'Audio', 'Tech', 'Apparel', 'Accessories'];

  const filteredProducts = activeCategory === 'All' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === activeCategory);

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
              variant={activeCategory === cat ? 'primary' : 'outline'}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map((p) => (
          <Link href={`/products/${p.id}`} key={p.id} className="group">
            <div className="glass rounded-[2rem] p-3 space-y-4 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/5">
              <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-muted">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {p.badge && (
                  <Badge className="absolute top-4 left-4 bg-secondary text-white font-bold px-3 py-1">
                    {p.badge}
                  </Badge>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <Button className="w-full bg-white text-black hover:bg-white/90 rounded-xl gap-2">
                    <ShoppingBag className="w-4 h-4" /> Quick Add
                  </Button>
                </div>
              </div>
              <div className="px-2 pb-2 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">{p.category}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">4.8</span>
                  </div>
                </div>
                <p className="text-2xl font-black text-primary">${p.price}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <p className="text-2xl font-bold">No products found in this category.</p>
          <Button variant="primary" onClick={() => setActiveCategory('All')}>Browse All Products</Button>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
