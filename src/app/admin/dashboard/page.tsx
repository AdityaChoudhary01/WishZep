
"use client";

import { useState } from 'react';
import { Package, Plus, Search, MoreHorizontal, Settings, BarChart3, Users, LayoutDashboard, Database, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const adminRoleRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'roles_admin', user.uid);
  }, [db, user]);

  const { data: adminRole } = useDoc(adminRoleRef);
  const isUserAdmin = !!adminRole;

  // Real data from Firestore
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'products'), orderBy('name', 'asc'));
  }, [db]);

  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const claimAdminRole = async () => {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, 'roles_admin', user.uid), {
        uid: user.uid,
        email: user.email,
        assignedAt: serverTimestamp()
      });
      toast({
        title: "Admin Access Granted! 🛡️",
        description: "You now have permissions to manage products.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Could not claim admin role. Check firestore rules.",
      });
    }
  };

  const seedSampleData = async () => {
    if (!db) return;
    if (!isUserAdmin) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You must enable Admin Mode first.",
      });
      return;
    }
    
    const sampleProducts = [
      {
        name: 'Neo-Stomp Tech Sneakers',
        price: 189,
        imageUrl: 'https://picsum.photos/seed/wishzep-p1/800/800',
        category: 'Footwear',
        description: 'High-performance techwear sneakers with aura-charged soles.',
        inventory: 45,
        attributes: 'Lightweight, Breathable, Neon Accents'
      },
      {
        name: 'SonicWave Elite Pro',
        price: 249,
        imageUrl: 'https://picsum.photos/seed/wishzep-p2/800/800',
        category: 'Audio',
        description: 'Noise-canceling headphones with spatial audio mapping.',
        inventory: 12,
        attributes: '40h Battery, Bluetooth 5.3, Aura Sync'
      },
      {
        name: 'Zenith Glass Smartwatch',
        price: 329,
        imageUrl: 'https://picsum.photos/seed/wishzep-p3/800/800',
        category: 'Tech',
        description: 'A minimalist smartwatch that monitors your aura levels.',
        inventory: 0,
        attributes: 'OLED Display, Water Resistant, Health Suite'
      },
      {
        name: 'Aura-X Techwear Jacket',
        price: 450,
        imageUrl: 'https://picsum.photos/seed/wishzep-p5/800/800',
        category: 'Apparel',
        description: 'Weather-resistant shell with integrated heat panels.',
        inventory: 5,
        attributes: 'Gore-Tex, Heated, Modular Pockets'
      }
    ];

    try {
      const proms = sampleProducts.map(p => addDoc(collection(db, 'products'), p));
      await Promise.all(proms);
      toast({
        title: "Success! ✨",
        description: "Sample products have been seeded into Firestore.",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Seeding failed",
        description: e.message,
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background pt-0">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/20 p-6 hidden md:block">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <span className="text-xl font-bold font-headline aura-text">Admin</span>
        </div>
        
        <nav className="space-y-2">
          <Button variant="ghost" className={`w-full justify-start gap-3 rounded-xl ${activeTab === 'dash' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setActiveTab('dash')}>
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Button>
          <Button variant="ghost" className={`w-full justify-start gap-3 rounded-xl ${activeTab === 'products' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setActiveTab('products')}>
            <Package className="w-5 h-5" /> Products
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" onClick={seedSampleData}>
            <Database className="w-5 h-5" /> Seed Demo Data
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl">
            <BarChart3 className="w-5 h-5" /> Analytics
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl">
            <Users className="w-5 h-5" /> Customers
          </Button>
          <div className="pt-10">
            {!isUserAdmin && (
              <Button 
                onClick={claimAdminRole}
                className="w-full justify-start gap-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white mb-4"
              >
                <ShieldCheck className="w-5 h-5" /> Claim Admin Status
              </Button>
            )}
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-muted-foreground">
              <Settings className="w-5 h-5" /> Settings
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">Manage <span className="aura-text">Inventory</span></h1>
            <p className="text-muted-foreground text-sm">Real-time control over your product catalogue.</p>
          </div>
          <div className="flex gap-4">
            {!isUserAdmin && (
               <Button onClick={claimAdminRole} className="rounded-2xl h-12 px-6 gap-2 bg-orange-500">
                 <ShieldCheck className="w-5 h-5" /> Enable Admin Mode
               </Button>
            )}
            <Button variant="outline" className="rounded-2xl h-12 px-6 gap-2 glass" onClick={seedSampleData}>
               <Database className="w-5 h-5" /> Seed Samples
            </Button>
            <Button className="rounded-2xl h-12 px-6 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5" /> Add New Product
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Revenue', value: '$45,290', trend: '+12% from last month', icon: BarChart3, color: 'text-primary' },
            { label: 'Active SKU', value: products?.length || 0, trend: 'All items live', icon: Package, color: 'text-secondary' },
            { label: 'Admin Status', value: isUserAdmin ? 'Authorized' : 'Locked', trend: isUserAdmin ? 'Full Access' : 'ReadOnly', icon: ShieldCheck, color: isUserAdmin ? 'text-green-500' : 'text-red-500' },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-3xl space-y-4 shadow-sm border border-white/40">
              <div className="flex justify-between">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Inventory Table */}
        <div className="glass rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-white/20 flex justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search database..." className="glass pl-12 rounded-xl bg-white/20 border-white/40 h-11" />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-white/30">
              <TableRow className="hover:bg-transparent border-white/20">
                <TableHead className="font-bold">Product</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="font-bold">Stock</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products?.map((p) => (
                <TableRow key={p.id} className="hover:bg-white/20 border-white/10 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative">
                        <Image src={p.imageUrl || `https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} fill className="object-cover" />
                      </div>
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                  <TableCell>{p.inventory} units</TableCell>
                  <TableCell className="font-bold">${p.price}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40"><MoreHorizontal /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!productsLoading && products?.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <Database className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-bold">No products in database.</p>
              <Button onClick={seedSampleData}>Seed Initial Catalog</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
