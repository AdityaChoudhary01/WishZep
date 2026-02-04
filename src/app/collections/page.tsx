
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Zap, Sparkles, Flame, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CollectionsPage() {
  const collections = [
    {
      id: 'aura-prime',
      name: 'Aura Prime',
      description: 'The foundation of techwear. Minimalist, functional, and charged with energy.',
      image: 'https://picsum.photos/seed/coll-1/800/600',
      icon: Sparkles,
      color: 'from-purple-500/20 to-blue-500/20'
    },
    {
      id: 'neon-pulse',
      name: 'Neon Pulse',
      description: 'High-visibility gear for the night crawlers. Reflective tech at its peak.',
      image: 'https://picsum.photos/seed/coll-2/800/600',
      icon: Zap,
      color: 'from-yellow-500/20 to-orange-500/20'
    },
    {
      id: 'zenith-core',
      name: 'Zenith Core',
      description: 'Premium accessories and smart gadgets that redefine your lifestyle.',
      image: 'https://picsum.photos/seed/coll-3/800/600',
      icon: Flame,
      color: 'from-red-500/20 to-pink-500/20'
    },
    {
      id: 'glacial-tech',
      name: 'Glacial Tech',
      description: 'Cool-toned, winter-ready performance wear for harsh conditions.',
      image: 'https://picsum.photos/seed/coll-4/800/600',
      icon: Snowflake,
      color: 'from-cyan-500/20 to-blue-600/20'
    }
  ];

  return (
    <div className="container mx-auto px-6 py-12 space-y-16">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-6xl font-black tracking-tighter">THE <span className="aura-text">COLLECTIONS</span></h1>
        <p className="text-xl text-muted-foreground font-light leading-relaxed">
          Each collection is a curated energy field. Choose the one that resonates with your current aura and step into the future.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map((collection) => (
          <Link href={`/products?collection=${collection.id}`} key={collection.id} className="group">
            <div className={`relative h-[400px] rounded-[3rem] overflow-hidden glass p-8 flex flex-col justify-end transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/20`}>
              <Image 
                src={collection.image} 
                alt={collection.name} 
                fill 
                className="object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000"
                data-ai-hint="lifestyle fashion"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${collection.color} opacity-60`} />
              
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform">
                  <collection.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-4xl font-black text-white">{collection.name}</h2>
                <p className="text-white/80 max-w-sm line-clamp-2">{collection.description}</p>
                <Button variant="outline" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white hover:text-black gap-2 w-fit">
                  Explore Now <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
