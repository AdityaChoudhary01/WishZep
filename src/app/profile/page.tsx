"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Package, History, Settings, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'orders'), orderBy('orderDate', 'desc'));
  }, [db, user]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  if (isUserLoading) return <div className="p-20 text-center">Charging your profile...</div>;

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-12 space-y-12">
      <header className="flex flex-col md:flex-row items-center gap-8 glass p-10 rounded-[3rem]">
        <Avatar className="w-32 h-32 border-4 border-primary shadow-2xl">
          <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200`} />
          <AvatarFallback className="text-4xl font-black bg-primary/10">{user.email?.[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-4xl font-black">{user.displayName || 'Aura Member'}</h1>
          <p className="text-muted-foreground font-medium">{user.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">Member since 2024</Badge>
            <Badge variant="outline" className="glass">Aura Status: Platinum</Badge>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-xl glass gap-2">
            <Settings className="w-4 h-4" /> Edit Profile
          </Button>
          <Button variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10 gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="glass bg-white/20 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="orders" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" /> Order History
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="py-20 text-center">Loading your history...</div>
          ) : !orders || orders.length === 0 ? (
            <div className="glass rounded-[2rem] p-20 text-center space-y-6">
              <Package className="w-16 h-16 text-muted-foreground mx-auto" />
              <h3 className="text-2xl font-black">No orders yet.</h3>
              <p className="text-muted-foreground max-w-md mx-auto">Start your collection by exploring our latest drops.</p>
              <Link href="/products">
                <Button className="rounded-full bg-primary hover:bg-primary/90 px-8">Shop Now</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <div key={order.id} className="glass rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {mounted ? new Date(order.orderDate).toLocaleDateString() : '...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="text-center md:text-right">
                      <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Amount</p>
                      <p className="text-xl font-black">${order.totalAmount}</p>
                    </div>
                    <Badge className={
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }>
                      {order.status.toUpperCase()}
                    </Badge>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/40">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <div className="glass rounded-[2.5rem] p-10 max-w-2xl">
            <h2 className="text-2xl font-black mb-8">Account Preferences</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/20 pb-4">
                <div>
                  <p className="font-bold">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates on new drops and sales.</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">Enabled</Button>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-4">
                <div>
                  <p className="font-bold">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Secure your account with 2FA.</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">Configure</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
