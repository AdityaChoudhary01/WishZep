
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { collection, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { 
  Package, 
  History, 
  LogOut, 
  Camera, 
  Loader2, 
  Edit3, 
  Save, 
  X as CloseIcon, 
  Truck, 
  MapPin, 
  Calendar, 
  ShoppingBag,
  CreditCard,
  Info,
  CheckCircle2,
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
import { useState, useEffect, useRef, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

function OrderItemsList({ orderId }: { orderId: string }) {
  const db = useFirestore();
  const itemsQuery = useMemoFirebase(() => {
    if (!db || !orderId) return null;
    return query(collection(db, 'orders', orderId, 'order_items'));
  }, [db, orderId]);

  const { data: items, isLoading } = useCollection(itemsQuery);

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {items?.map((item) => (
        <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 items-center">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {item.image ? (
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200"><Package className="w-6 h-6 text-gray-400" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold text-sm truncate">{item.name}</h5>
            <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{item.quantity} Unit{item.quantity > 1 ? 's' : ''}</p>
          </div>
          <p className="font-black text-primary">Rs.{item.price?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

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
    // Client-side filtering is handled by firestore security rules
    // and manual sorting is done in useMemo to avoid index errors.
    return query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid)
    );
  }, [db, user]);

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection(ordersQuery);

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [orders]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signal Disconnected", description: "You have been signed out successfully." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Disconnection Error", description: error.message });
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
      toast({ title: "Visual Artifact Updated!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Protocol Failed", description: error.message });
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
      toast({ title: "Identity Log Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
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
      <header className="flex flex-col md:flex-row items-center gap-8 bg-white border border-gray-100 p-10 rounded-[3rem] shadow-xl">
        <div className="relative group">
          <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-2xl transition-transform group-hover:rotate-6">
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
              <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="max-w-xs h-12 rounded-xl bg-gray-50" autoFocus />
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
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Verified Visionary</Badge>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => setIsEditingName(true)}><Edit3 className="w-4 h-4" /> Edit Profile</Button>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-xl text-destructive hover:bg-destructive/10 gap-2 w-full"><LogOut className="w-4 h-4" /> Sign Out</Button>
        </div>
      </header>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-white border border-gray-100 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="orders" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" /> Artifact History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="py-20 text-center animate-pulse text-muted-foreground uppercase font-black tracking-widest">Accessing Registry...</div>
          ) : ordersError ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-12 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-xl font-bold">Registry Sync Error</h3>
              <p className="text-muted-foreground max-w-md mx-auto">We encountered an issue while fetching your history. Please ensure your signal is strong and try again.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Retry Sync</Button>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-20 text-center space-y-6">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-primary/30" />
              </div>
              <h3 className="text-3xl font-black">Your vault is empty.</h3>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">It's time to secure your first artifact. Explore the latest drops now.</p>
              <Link href="/products" className="inline-block pt-4">
                <Button className="rounded-full bg-primary h-16 px-12 text-xl font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">Explore Catalogue</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {sortedOrders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm transition-all hover:shadow-md group">
                  <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:rotate-6 transition-transform flex-shrink-0">
                      <Package className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xl">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <Badge className={cn(
                        "mt-2 px-4 py-1.5 rounded-full text-[10px] uppercase font-black border-none",
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {order.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="text-center md:text-right mr-0 md:mr-8">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Order Value</p>
                      <p className="text-2xl font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold gap-2">
                            <Info className="w-4 h-4" /> Order Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
                          <div className="bg-primary p-8 text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <DialogHeader>
                              <DialogTitle className="text-3xl font-black">DROP LOGISTICS</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-widest mt-2">Protocol ID: {order.id}</p>
                          </div>
                          
                          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Included Artifacts</h4>
                              <OrderItemsList orderId={order.id} />
                            </div>

                            <Separator className="bg-gray-100" />

                            <div className="grid md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Shipping Destination</h4>
                                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"><MapPin className="w-3.5 h-3.5" /> Coordinates</div>
                                  <p className="text-sm font-bold leading-relaxed">{order.shippingAddress}</p>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Summary</h4>
                                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"><CreditCard className="w-3.5 h-3.5" /> Gateway</div>
                                  <p className="text-sm font-bold">{order.paymentMethod || 'Razorpay Interface'}</p>
                                  <div className="flex justify-between items-center pt-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Logistics</span>
                                    <span className="text-xs font-bold text-green-600">FREE</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-1 border-t border-gray-200 mt-2">
                                    <span className="text-sm font-black">TOTAL</span>
                                    <span className="text-lg font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="rounded-2xl h-12 px-6 font-black bg-primary gap-2 shadow-lg shadow-primary/20">
                            <Truck className="w-4 h-4" /> Track Drop
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white rounded-[3rem] border-none p-10 shadow-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-3xl font-black text-center mb-6">TRACKING SIGNAL</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-10 relative">
                            <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-gray-100" />
                            
                            <div className="flex gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", "bg-primary text-white")}>
                                <CheckCircle2 className="w-7 h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-lg">Drop Confirmed</h4>
                                <p className="text-sm text-muted-foreground">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'} • System Synchronized</p>
                              </div>
                            </div>

                            <div className="flex gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", ['shipped', 'delivered'].includes(order.status) ? "bg-primary text-white" : "bg-gray-100 text-gray-300")}>
                                <Truck className="w-7 h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-lg">In Transit</h4>
                                <p className="text-sm text-muted-foreground">{order.status === 'pending' || !order.status ? 'Preparing for departure...' : 'Moving via Global Express'}</p>
                              </div>
                            </div>

                            <div className="flex gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", order.status === 'delivered' ? "bg-green-500 text-white" : "bg-gray-100 text-gray-300")}>
                                <Package className="w-7 h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-lg">Delivered</h4>
                                <p className="text-sm text-muted-foreground">{order.status === 'delivered' ? 'Received at destination coordinates' : 'Pending final arrival'}</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
