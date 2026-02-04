
"use client";

import Link from 'next/link';
import { ShoppingBag, User, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useCartStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartItems = useCartStore((state) => state.items);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const db = useFirestore();
  
  // Use manual categories if available, else fallback to hardcoded common ones for safety
  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const productCategoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'products');
  }, [db]);
  const { data: products } = useCollection(productCategoriesQuery);

  const dynamicCategories = useMemo(() => {
    // Priority: 1. Manually created categories, 2. Categories extracted from products
    const manualCats = categories?.map(c => c.name) || [];
    const productCats = products?.map(p => p.category).filter(Boolean) || [];
    const allCats = new Set([...manualCats, ...productCats]);
    return Array.from(allCats).sort();
  }, [categories, products]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      params.set('search', searchQuery.trim());
      router.push(`/products?${params.toString()}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4',
        isScrolled ? 'glass py-3' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center rotate-12 group-hover:rotate-0 transition-transform shadow-lg">
            <span className="text-white font-bold text-2xl">W</span>
          </div>
          <span className="text-2xl font-bold font-headline wishzep-text tracking-tighter">WishZep</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/products"
            className="text-sm font-medium hover:text-primary transition-colors relative group"
          >
            Shop All
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group relative">
                Categories <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass min-w-[200px] rounded-2xl p-2 border-white/20">
              {dynamicCategories.length > 0 ? (
                dynamicCategories.map((cat) => (
                  <DropdownMenuItem key={cat} asChild>
                    <Link 
                      href={`/products?category=${cat}`}
                      className="cursor-pointer rounded-xl hover:bg-primary/10 hover:text-primary font-medium"
                    >
                      {cat}
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">No categories yet</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          {isSearchOpen ? (
            <form onSubmit={handleSearch} className="relative animate-in slide-in-from-right-4">
              <Input
                autoFocus
                placeholder="Find gear..."
                className="w-48 h-10 rounded-full glass pl-4 pr-10 border-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery) setIsSearchOpen(false);
                }}
              />
              <Button type="submit" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8">
                <Search className="w-4 h-4 text-primary" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors" onClick={() => setIsSearchOpen(true)}>
              <Search className="w-5 h-5" />
            </Button>
          )}
          
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors">
              <User className="w-5 h-5" />
            </Button>
          </Link>
          
          <Link href="/cart" className="relative">
            <Button variant="default" size="icon" className="rounded-full shadow-lg shadow-primary/20">
              <ShoppingBag className="w-5 h-5" />
              {mounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass absolute top-full left-0 right-0 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          <Link
            href="/products"
            className="text-lg font-semibold hover:text-primary p-2 rounded-lg hover:bg-primary/5 transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Shop All
          </Link>
          <div className="p-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {dynamicCategories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${cat}`}
                  className="text-sm font-medium hover:text-primary transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
