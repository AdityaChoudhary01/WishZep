
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, ShieldCheck, Zap, Star, CheckCircle2, PackageSearch, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const db = useFirestore();
  const { toast } = useToast();

  // Optimized query to fetch the 12 most recent products
  const featuredQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'products'), 
      orderBy('createdAt', 'desc'),
      limit(12)
    );
  }, [db]);

  const { data: featuredProducts, isLoading } = useCollection(featuredQuery);

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

  return (
    <div className="flex flex-col gap-16 md:gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center overflow-hidden pt-10">
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

        <div className="container mx-auto px-6 relative z-10 pb-10 md:pb-20">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <Badge variant="outline" className="px-4 md:px-6 py-1.5 md:py-2 border-primary text-primary glass rounded-full text-[10px] md:text-sm font-bold tracking-widest uppercase">
                ✨ The WishZep Experience
              </Badge>
            </div>
            <h1 className="text-5xl md:text-9xl font-black tracking-tighter leading-tight md:leading-none">
              SHOP WITH <br />
              <span className="wishzep-text">ATTITUDE.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
              WishZep brings you the ultimate curated collection of high-energy gear, designed to redefine your lifestyle frequency.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-4 md:pt-6">
              <Link href="/products">
                <Button size="lg" className="h-14 md:h-20 px-8 md:px-12 rounded-full bg-primary hover:bg-primary/90 text-lg md:text-2xl font-black group shadow-2xl shadow-primary/30">
                  Shop Now <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform w-5 h-5 md:w-8 md:h-8" />
                </Button>
              </Link>
              <Link href="/info/contact">
                <Button size="lg" variant="outline" className="h-14 md:h-20 px-8 md:px-12 rounded-full glass text-lg md:text-2xl font-black">
                  Enquiry
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-4 md:px-6 -mt-8 md:-mt-16 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 py-8 md:py-12 glass rounded-[2rem] md:rounded-[3rem] shadow-2xl bg-white/60">
          {[
            { icon: Zap, title: 'Express Ship', desc: 'Arrives in 2-3 days' },
            { icon: ShieldCheck, title: 'Secure Pay', desc: '100% safe checkouts' },
            { icon: Star, title: 'Premium', desc: 'Handpicked selection' },
            { icon: CheckCircle2, title: 'Verified', desc: 'Final Sale Quality' },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center gap-1 md:gap-2">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
                <item.icon className="w-5 h-5 md:w-8 md:h-8 text-primary" />
              </div>
              <h4 className="font-bold text-xs md:text-lg">{item.title}</h4>
              <p className="text-[8px] md:text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products (Latest Drops) */}
      <section className="container mx-auto px-4 md:px-6 space-y-10 md:space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 text-center md:text-left">
          <div className="space-y-2 md:space-y-4">
            <h2 className="text-3xl md:text-6xl font-black tracking-tight uppercase leading-tight">LATEST <span className="wishzep-text">DROPS</span></h2>
            <p className="text-sm md:text-xl text-muted-foreground">The most anticipated releases, calibrated for performance.</p>
          </div>
          <Link href="/products">
            <Button variant="link" className="text-primary text-sm md:text-xl font-black gap-2 p-0 h-auto">
              View All Catalogue <ArrowRight className="w-4 h-4 md:w-6 md:h-6" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-[1.5rem] md:rounded-[3rem]" />
                <Skeleton className="h-8 w-3/4 rounded-full" />
                <Skeleton className="h-6 w-1/4 rounded-full" />
              </div>
            ))}
          </div>
        ) : featuredProducts && featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-10">
            {featuredProducts.map((p) => (
              <Link href={`/products/${p.id}`} key={p.id} className="group">
                <div className="glass rounded-[1.5rem] md:rounded-[3rem] p-2 md:p-6 space-y-3 md:space-y-6 transition-all hover:-translate-y-2 md:hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/20">
                  <div className="relative aspect-square rounded-[1.2rem] md:rounded-[2.5rem] overflow-hidden bg-muted">
                    <Image
                      src={p.imageUrl || `https://picsum.photos/seed/${p.id}/800/800`}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <button 
                      onClick={(e) => handleShare(e, p)}
                      className="absolute top-2 right-2 md:top-6 md:right-6 w-8 h-8 md:w-12 md:h-12 rounded-full glass flex items-center justify-center hover:bg-primary hover:text-white transition-all z-10"
                    >
                      <Share2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    </button>

                    <Button
                      size="lg"
                      className="absolute bottom-2 right-2 md:bottom-6 md:right-6 rounded-lg md:rounded-2xl glass-dark text-white opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 h-8 w-8 md:h-14 md:w-14"
                    >
                      <ShoppingBag className="w-4 h-4 md:w-6 md:h-6" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-start pt-1 md:pt-2 px-1 md:px-0 gap-2">
                    <div className="space-y-1 md:space-y-2 flex-1 min-w-0">
                      <h3 className="font-black text-xs md:text-2xl group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-2 h-2 md:w-3.5 md:h-3.5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-[7px] md:text-[11px] font-bold text-muted-foreground ml-1 uppercase tracking-tight truncate">Verified Drop</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      {p.discountPrice && p.discountPrice > 0 ? (
                        <>
                          <span className="text-[8px] md:text-sm text-muted-foreground line-through decoration-muted-foreground/50">Rs.{p.price.toLocaleString()}</span>
                          <span className="text-sm md:text-3xl font-black text-primary whitespace-nowrap">Rs.{p.discountPrice.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="text-sm md:text-3xl font-black text-primary whitespace-nowrap">Rs.{p.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 glass rounded-[2rem] md:rounded-[3rem] text-center space-y-6">
            <PackageSearch className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black">No Drops Detected</h3>
              <p className="text-sm text-muted-foreground">The vault is currently locked. Head to the admin dashboard to release the gear.</p>
            </div>
            <Link href="/admin/dashboard">
              <Button variant="outline" className="rounded-full px-8 h-12 font-black">Access Admin Vault</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
