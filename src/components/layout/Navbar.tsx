"use client";

import Link from 'next/link';
import { 
  ShoppingBag, 
  User, 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  ShieldCheck, 
  Zap, 
  Package, 
  Tags, 
  ArrowRight,
  LogOut,
  Info,
  Instagram,
  Twitter,
  LayoutDashboard,
  Sparkles,
  Grid
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useCartStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, useAuth } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import BrandLogo from '@/components/BrandLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const cartItems = useCartStore((state) => state.items);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const db = useFirestore();
  const { user } = useUser();
  
  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole, isLoading: adminLoading } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole && !adminLoading;

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);
  const { data: manualCategories } = useCollection(categoriesQuery);

  const dynamicCategories = useMemo(() => {
    return (manualCategories?.map(c => c.name) || []).sort();
  }, [manualCategories]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      params.set('search', searchQuery.trim());
      router.push(`/products?${params.toString()}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-[50] transition-all duration-500 px-6 py-4',
          isScrolled ? 'glass py-3 shadow-sm' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="group flex items-center relative z-[60]">
            <BrandLogo size="md" className="transition-transform group-hover:scale-105" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/products"
              className="text-sm font-medium hover:text-primary transition-colors relative group"
            >
              Shop All
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>

            {dynamicCategories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group relative">
                    Categories <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass min-w-[200px] rounded-2xl p-2 border-white/20">
                  {dynamicCategories.map((cat) => (
                    <DropdownMenuItem key={cat} asChild>
                      <Link 
                        href={`/products?category=${cat}`}
                        className="cursor-pointer rounded-xl hover:bg-primary/10 hover:text-primary font-medium"
                      >
                        {cat}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isUserAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-sm font-black text-primary hover:opacity-80 transition-all flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative z-[60]">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="relative animate-in slide-in-from-right-4">
                <Input
                  autoFocus
                  placeholder="Find gear..."
                  className="w-32 md:w-48 h-10 rounded-full glass pl-4 pr-10 border-primary/30 text-sm"
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
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors text-foreground" onClick={() => setIsSearchOpen(true)}>
                <Search className="w-5 h-5" />
              </Button>
            )}
            
            <Link href="/profile" className="hidden md:block">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors text-foreground">
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

            {/* Hamburger Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "md:hidden rounded-full transition-all text-foreground hover:bg-primary/5",
                isMobileMenuOpen && "opacity-0 pointer-events-none" 
              )}
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* --- Ultra-Modern Vertical Half-Screen Drawer --- */}
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-opacity duration-500 md:hidden",
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Vertical Drawer (Slides from Top) */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-3xl shadow-2xl rounded-b-[3rem] border-b border-white/20 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col overflow-hidden md:hidden h-auto max-h-[85vh]",
          isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        )}
      >
        {/* Decor Blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

        {/* Drawer Header */}
        <div className="relative z-10 p-6 pt-8 flex items-center justify-between">
           <BrandLogo size="md" />
           <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
             <X className="w-6 h-6" />
           </Button>
        </div>

        {/* Drawer Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-6 space-y-8 no-scrollbar">
           
           {/* Main Navigation Cards */}
           <div className="grid gap-3 pt-4">
             <Link href="/products" className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 border border-primary/10 transition-all group" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-tight text-lg text-primary">Shop All</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Explore Collection</p>
                </div>
                <ArrowRight className="ml-auto w-5 h-5 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
             </Link>
             
             <Link href="/profile" className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-100 to-transparent hover:from-gray-200 border border-gray-100 transition-all group" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center text-gray-700 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black uppercase tracking-tight text-lg">Profile</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Orders & Settings</p>
                </div>
             </Link>
           </div>

           {/* Categories Grid */}
           <div className="space-y-4">
             <div className="flex items-center gap-2">
               <Grid className="w-4 h-4 text-primary" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Top Categories</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
               {dynamicCategories.slice(0, 8).map((cat) => (
                 <Link 
                   key={cat}
                   href={`/products?category=${cat}`}
                   className="p-3 rounded-xl bg-white/40 border border-white/20 text-sm font-bold text-center hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 truncate"
                   onClick={() => setIsMobileMenuOpen(false)}
                 >
                   {cat}
                 </Link>
               ))}
             </div>
           </div>

           {/* Admin & Logout Section */}
           <div className="space-y-3 pt-2">
              {isUserAdmin && (
                <Link href="/admin/dashboard" className="w-full flex items-center gap-3 p-4 rounded-2xl bg-black/5 hover:bg-black/10 transition-all font-bold text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                  <LayoutDashboard className="w-5 h-5" /> Admin Dashboard
                </Link>
              )}
              
              {user ? (
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all font-bold text-sm">
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              ) : (
                <Link href="/auth/login" className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-black text-white shadow-xl font-bold text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                  <User className="w-5 h-5" /> Sign In / Register
                </Link>
              )}
           </div>
        </div>

        {/* Drawer Footer Handle */}
        <div className="w-full flex justify-center pb-4 pt-2">
           <div className="w-16 h-1.5 bg-gray-200/50 rounded-full" />
        </div>
      </div>
    </>
  );
}
