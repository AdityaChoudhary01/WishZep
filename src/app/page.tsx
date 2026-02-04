"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, ShieldCheck, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const db = useFirestore();

  const featuredQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), limit(3));
  }, [db]);

  const { data: featuredProducts, isLoading } = useCollection(featuredQuery);

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://picsum.photos/seed/wishzep-hero/1920/1080"
            alt="Hero Background"
            fill
            className="object-cover opacity-60 mix-blend-overlay"
            priority
            data-ai-hint="abstract gradient"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <Badge variant="outline" className="px-4 py-1 border-primary text-primary glass">
              ✨ Discover the WishZep Edition
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              SHOP WITH <br />
              <span className="wishzep-text">ATTITUDE.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg font-light leading-relaxed">
              WishZep brings you the ultimate curated collection of high-energy gear, designed to complement your lifestyle.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/products">
                <Button size="lg" className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-lg group shadow-xl shadow-primary/30">
                  Shop Now <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/collections">
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full glass text-lg">
                  Explore Collections
                </Button>
              </Link>
            </div>
          </div>

          <div className="hidden md:block relative animate-float">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative glass rounded-3xl p-4 overflow-hidden shadow-2xl">
              <Image
                src="https://picsum.photos/seed/wishzep-hero-p/800/1000"
                alt="Featured Product"
                width={600}
                height={800}
                className="rounded-2xl object-cover hover:scale-105 transition-transform duration-700"
                data-ai-hint="fashion model"
              />
              <div className="absolute bottom-8 left-8 right-8 glass p-6 rounded-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">WishZep Techwear Jacket</h3>
                    <p className="text-primary font-bold">$450.00</p>
                  </div>
                  <Link href="/products">
                    <Button size="icon" className="rounded-full bg-white text-black hover:bg-white/90">
                      <ShoppingBag className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 glass rounded-3xl">
          {[
            { icon: Zap, title: 'Express Shipping', desc: 'Arrives in 2-3 days' },
            { icon: ShieldCheck, title: 'Secure Payment', desc: '100% safe checkouts' },
            { icon: Star, title: 'Premium Quality', desc: 'Handpicked selection' },
            { icon: ArrowRight, title: 'Easy Returns', desc: '30-day window' },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-bold text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-6 space-y-12">
        <div className="flex justify-between items-end gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black">LATEST <span className="wishzep-text">DROPS</span></h2>
            <p className="text-muted-foreground">The most anticipated releases, available now.</p>
          </div>
          <Link href="/products">
            <Button variant="link" className="text-primary font-bold gap-2 p-0">
              View All Products <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-3xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))
          ) : (
            featuredProducts?.map((p) => (
              <Link href={`/products/${p.id}`} key={p.id} className="group">
                <div className="glass rounded-3xl p-4 space-y-4 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                    <Image
                      src={p.imageUrl || `https://picsum.photos/seed/${p.id}/800/800`}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Button
                      size="icon"
                      className="absolute bottom-4 right-4 rounded-full glass-dark text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start pt-2">
                    <div>
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium text-muted-foreground">4.9 (120 reviews)</span>
                      </div>
                    </div>
                    <span className="text-xl font-black text-primary">${p.price}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Categories / Mesh Promo */}
      <section className="container mx-auto px-6">
        <div className="relative rounded-3xl overflow-hidden bg-primary h-[400px] flex items-center px-12 group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary mix-blend-multiply opacity-50" />
          <Image
            src="https://picsum.photos/seed/wishzep-promo/1200/600"
            alt="Promo"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
            data-ai-hint="lifestyle accessories"
          />
          <div className="relative z-10 space-y-6 max-w-xl">
            <h2 className="text-5xl font-black text-white leading-tight">
              UP TO 50% OFF <br />
              <span className="text-secondary">WISHZEP ESSENTIALS</span>
            </h2>
            <Link href="/products">
              <Button size="lg" className="rounded-full bg-white text-primary hover:bg-white/90">
                Claim Discount
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
