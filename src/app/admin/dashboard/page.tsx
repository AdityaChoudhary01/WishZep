
"use client";

import { useState } from 'react';
import { Package, Plus, Search, MoreHorizontal, Settings, BarChart3, Users, LayoutDashboard, Database } from 'lucide-react';
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
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const db = useFirestore();
  const { toast } = useToast();

  const products = [
    { id: '1', name: 'Neo-Stomp Tech Sneakers', stock: 45, price: 189, category: 'Footwear', status: 'Active' },
    { id: '2', name: 'SonicWave Elite Pro', stock: 12, price: 249, category: 'Audio', status: 'Low Stock' },
    { id: '3', name: 'Zenith Glass Smartwatch', stock: 0, price: 329, category: 'Tech', status: 'Out of Stock' },
  ];

  const seedSampleData = async () => {
    if (!db) return;
    
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
            <h1 className="text-3xl font-black">Manage <span className="aura-text">Products</span></h1>
            <p className="text-muted-foreground text-sm">Organize and update your inventory drops.</p>
          </div>
          <div className="flex gap-4">
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
            { label: 'Total Sales', value: '$45,290', trend: '+12% from last month', icon: BarChart3, color: 'text-primary' },
            { label: 'Active Products', value: '142', trend: '3 new items this week', icon: Package, color: 'text-secondary' },
            { label: 'Satisfaction', value: '4.9/5', trend: 'Based on 500+ reviews', icon: Star, color: 'text-yellow-500' },
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
              <Input placeholder="Search inventory..." className="glass pl-12 rounded-xl bg-white/20 border-white/40 h-11" />
            </div>
          </div>
          <Table>
            <TableHeader className="bg-white/30">
              <TableRow className="hover:bg-transparent border-white/20">
                <TableHead className="font-bold">Product</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="font-bold">Stock</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="hover:bg-white/20 border-white/10 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative">
                        <Image src={`https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} fill className="object-cover" />
                      </div>
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.stock} units</TableCell>
                  <TableCell className="font-bold">${p.price}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-bold",
                      p.status === 'Active' ? "bg-green-100 text-green-700" :
                      p.status === 'Low Stock' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    )}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40"><MoreHorizontal /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4 text-center border-t border-white/10">
            <Button variant="link" className="text-xs text-muted-foreground hover:text-primary">View Full Inventory</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      stroke="none"
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
