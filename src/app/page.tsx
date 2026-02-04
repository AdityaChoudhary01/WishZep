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
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
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

        <div className="container mx-auto px-6 relative z-10 pb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <Badge variant="outline" className="px-6 py-2 border-primary text-primary glass rounded-full text-sm font-bold tracking-widest uppercase">
                ✨ The WishZep Experience
              </Badge>
            </div>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none">
              SHOP WITH <br />
              <span className="wishzep-text">ATTITUDE.</span>
            </h1>
            <p className="text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              WishZep brings you the ultimate curated collection of high-energy gear, designed to redefine your lifestyle frequency.
            </p>
            <div className="flex flex-wrap justify-center gap-6 pt-6">
              <Link href="/products">
                <Button size="lg" className="h-20 px-12 rounded-full bg-primary hover:bg-primary/90 text-2xl font-black group shadow-2xl shadow-primary/30">
                  Shop Now <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform w-8 h-8" />
                </Button>
              </Link>
              <Link href="/collections">
                <Button size="lg" variant="outline" className="h-20 px-12 rounded-full glass text-2xl font-black">
                  Collections
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-6 -mt-32 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 glass rounded-[3rem] shadow-2xl bg-white/60">
          {[
            { icon: Zap, title: 'Express Shipping', desc: 'Arrives in 2-3 days' },
            { icon: ShieldCheck, title: 'Secure Payment', desc: '100% safe checkouts' },
            { icon: Star, title: 'Premium Quality', desc: 'Handpicked selection' },
            { icon: ArrowRight, title: 'Easy Returns', desc: '30-day window' },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-bold text-lg">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-6 space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-center md:text-left">
          <div className="space-y-4">
            <h2 className="text-6xl font-black tracking-tight">LATEST <span className="wishzep-text">DROPS</span></h2>
            <p className="text-xl text-muted-foreground">The most anticipated releases, calibrated for performance.</p>
          </div>
          <Link href="/products">
            <Button variant="link" className="text-primary text-xl font-black gap-2 p-0 h-auto">
              View All Catalogue <ArrowRight className="w-6 h-6" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-[3rem]" />
                <Skeleton className="h-8 w-3/4 rounded-full" />
                <Skeleton className="h-6 w-1/4 rounded-full" />
              </div>
            ))
          ) : (
            featuredProducts?.map((p) => (
              <Link href={`/products/${p.id}`} key={p.id} className="group">
                <div className="glass rounded-[3rem] p-6 space-y-6 transition-all hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-muted">
                    <Image
                      src={p.imageUrl || `https://picsum.photos/seed/${p.id}/800/800`}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Button
                      size="lg"
                      className="absolute bottom-6 right-6 rounded-2xl glass-dark text-white opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0"
                    >
                      <ShoppingBag className="w-6 h-6" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start pt-2">
                    <div className="space-y-2">
                      <h3 className="font-black text-2xl group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-xs font-bold text-muted-foreground ml-2">Verified Drop</span>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-primary">${p.price}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Mesh Promo Section */}
      <section className="container mx-auto px-6">
        <div className="relative rounded-[4rem] overflow-hidden bg-primary h-[500px] flex items-center px-12 md:px-24 group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary mix-blend-multiply opacity-60" />
          <Image
            src="https://picsum.photos/seed/wishzep-promo/1600/800"
            alt="Promo"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
            data-ai-hint="lifestyle accessories"
          />
          <div className="relative z-10 space-y-8 max-w-2xl">
            <Badge className="bg-white/20 text-white border-white/40 px-6 py-1 rounded-full text-xs font-bold uppercase tracking-[0.3em]">Season Finale</Badge>
            <h2 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter">
              UP TO 50% OFF <br />
              <span className="text-secondary drop-shadow-lg">WISHLIST GEMS</span>
            </h2>
            <Link href="/products">
              <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-primary hover:bg-white/90 text-xl font-black shadow-2xl">
                Claim Your WishZep Credit
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
