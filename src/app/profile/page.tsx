
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { collection, orderBy, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { 
  Package, 
  History, 
  LogOut, 
  ChevronRight, 
  Camera, 
  Loader2, 
  Edit3, 
  Save, 
  X as CloseIcon, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    if (profileData?.displayName) {
      setEditedName(profileData.displayName);
    }
  }, [profileData]);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // We must strictly match the rules: filter by userId to allow list permission
    return query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('orderDate', 'desc')
    );
  }, [db, user]);

  // Use silentPermissionError: true to prevent crashing if the backend is syncing
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection(ordersQuery, true);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out successfully." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error signing out", description: error.message });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !db) return;
    setIsUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      await updateDoc(doc(db, 'users', user.uid), {
        profileImageUrl: imageUrl,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Profile image updated! ✨" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editedName.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingName(false);
      toast({ title: "Name updated! ✨" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to update name", description: error.message });
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const profileImage = profileData?.profileImageUrl || user.photoURL || `https://picsum.photos/seed/${user.uid}/200`;

  return (
    <div className="container mx-auto px-6 py-12 space-y-12 max-w-6xl">
      <header className="flex flex-col md:flex-row items-center gap-8 glass p-10 rounded-[3rem] shadow-2xl">
        <div className="relative group">
          <Avatar className="w-32 h-32 border-4 border-primary shadow-2xl transition-transform group-hover:rotate-6">
            <AvatarImage src={profileImage} className="object-cover" />
            <AvatarFallback className="text-4xl font-black bg-primary/10">{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          {isEditingName ? (
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="max-w-xs h-12 rounded-xl glass" autoFocus />
              <div className="flex gap-2">
                <Button onClick={handleSaveName} className="rounded-xl h-12 bg-primary"><Save className="w-4 h-4 mr-2" /> Save</Button>
                <Button variant="ghost" onClick={() => setIsEditingName(false)} className="rounded-xl h-12"><CloseIcon className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-4xl font-black">{profileData?.displayName || 'WishZep Member'}</h1>
              <p className="text-muted-foreground font-medium">{user.email}</p>
            </div>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">Member Status: Elite</Badge>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="rounded-xl glass gap-2 w-full" onClick={() => setIsEditingName(true)}><Edit3 className="w-4 h-4" /> Edit Profile</Button>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-xl text-destructive hover:bg-destructive/10 gap-2 w-full"><LogOut className="w-4 h-4" /> Sign Out</Button>
        </div>
      </header>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="glass bg-white/20 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="orders" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" /> My Order Vault
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="py-20 text-center animate-pulse">Scanning orders...</div>
          ) : ordersError ? (
            <div className="glass rounded-[2rem] p-12 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-xl font-bold">Connection Syncing</h3>
              <p className="text-muted-foreground text-sm">We're finalizing your access. Please try refreshing in a moment.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Retry Connection</Button>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="glass rounded-[2rem] p-20 text-center space-y-6">
              <Package className="w-16 h-16 text-muted-foreground mx-auto" />
              <h3 className="text-2xl font-black">Your vault is empty.</h3>
              <p className="text-muted-foreground">Initialize your collection by exploring latest drops.</p>
              <Link href="/products"><Button className="rounded-full bg-primary h-12 px-8">Shop Catalogue</Button></Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Dialog key={order.id}>
                  <DialogTrigger asChild>
                    <div className="glass rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer hover:bg-white/30 transition-all border border-white/20 group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:rotate-6 transition-transform">
                          <Package className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xl font-black wishzep-text">Rs.{order.totalAmount?.toLocaleString()}</p>
                        </div>
                        <Badge className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] uppercase font-black",
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {order.status?.toUpperCase() || 'PENDING'}
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="glass max-w-2xl border-white/30 rounded-[2.5rem] p-8 shadow-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-3xl font-black wishzep-text">Order Tracking</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-8 mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-4 rounded-2xl space-y-2 border-white/20">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest"><Clock className="w-4 h-4" /> Status</div>
                          <p className="text-xl font-black capitalize">{order.status || 'Processing'}</p>
                        </div>
                        <div className="glass p-4 rounded-2xl space-y-2 border-white/20">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest"><Calendar className="w-4 h-4" /> Date</div>
                          <p className="text-xl font-black">{new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Shipping Objective</h4>
                        <div className="glass p-6 rounded-2xl border-white/20">
                          <p className="text-sm font-bold leading-relaxed">{order.shippingAddress}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Delivery Method</h4>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                          <span className="font-bold">Global Priority Express</span>
                          <Badge className="bg-green-500/20 text-green-600 border-none">Active Transit</Badge>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-between items-center border-t border-white/10">
                        <span className="text-muted-foreground font-bold">Transaction ID</span>
                        <span className="font-mono text-xs">{order.id}</span>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
