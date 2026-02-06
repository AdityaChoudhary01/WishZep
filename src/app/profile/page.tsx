
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
  AlertCircle,
  Search,
  Clock
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
        <div key={item.id} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-gray-50 border border-gray-100 items-center">
          <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {item.image ? (
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200"><Package className="w-6 h-6 text-gray-400" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold text-sm truncate">{item.name}</h5>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-black tracking-widest">{item.quantity} Unit{item.quantity > 1 ? 's' : ''}</p>
          </div>
          <p className="font-black text-primary text-sm md:text-base">Rs.{item.price?.toLocaleString()}</p>
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
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-12 max-w-6xl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-white border border-gray-100 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl">
        <div className="relative group shrink-0">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/20 shadow-2xl transition-transform group-hover:rotate-6">
            <AvatarImage src={profileImage} className="object-cover" />
            <AvatarFallback className="text-4xl font-black bg-primary/10">{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div className="flex-1 text-center md:text-left space-y-4 w-full">
          {isEditingName ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="max-w-xs h-12 rounded-xl bg-gray-50" autoFocus />
              <div className="flex gap-2">
                <Button onClick={handleSaveName} className="rounded-xl h-12 bg-primary"><Save className="w-4 h-4 mr-2" /> Save</Button>
                <Button variant="ghost" onClick={() => setIsEditingName(false)} className="rounded-xl h-12"><CloseIcon className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-2xl md:text-4xl font-black break-words">{profileData?.displayName || 'WishZep Member'}</h1>
              <p className="text-muted-foreground font-medium break-all">{user.email}</p>
            </div>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Verified Visionary</Badge>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
          <Button variant="outline" className="rounded-xl gap-2 w-full" onClick={() => setIsEditingName(true)}><Edit3 className="w-4 h-4" /> Edit Profile</Button>
          <Button variant="ghost" onClick={handleSignOut} className="rounded-xl text-destructive hover:bg-destructive/10 gap-2 w-full"><LogOut className="w-4 h-4" /> Sign Out</Button>
        </div>
      </header>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-white border border-gray-100 p-1 rounded-2xl h-auto min-h-[3.5rem] mb-6 md:mb-8 flex flex-wrap justify-start">
          <TabsTrigger value="orders" className="rounded-xl px-6 md:px-8 py-2 md:py-0 font-bold data-[state=active]:bg-primary data-[state=active]:text-white flex-1 md:flex-none">
            <History className="w-4 h-4 mr-2" /> Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="py-20 text-center animate-pulse text-muted-foreground uppercase font-black tracking-widest">Accessing orders...</div>
          ) : ordersError ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-8 md:p-12 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-xl font-bold">Orders Sync Error</h3>
              <p className="text-muted-foreground max-w-md mx-auto">We encountered an issue while fetching your history. Please ensure your signal is strong and try again.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Retry Sync</Button>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-8 md:p-20 text-center space-y-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <ShoppingBag className="w-10 h-10 md:w-12 md:h-12 text-primary/30" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black">Your Order History is empty.</h3>
              <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto">It's time to secure your first item. Explore the latest products now.</p>
              <Link href="/products" className="inline-block pt-4 w-full sm:w-auto">
                <Button className="rounded-full bg-primary h-14 md:h-16 w-full sm:w-auto px-8 md:px-12 text-lg md:text-xl font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">Explore Catalogue</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {sortedOrders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-5 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 shadow-sm transition-all hover:shadow-md group">
                  
                  {/* Left Side: Icon & Info */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 md:gap-8 w-full md:w-auto text-center sm:text-left">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:rotate-6 transition-transform flex-shrink-0">
                      <Package className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-lg md:text-xl">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                      </p>
                      <div className="flex justify-center sm:justify-start">
                        <Badge className={cn(
                          "mt-2 px-4 py-1.5 rounded-full text-[10px] uppercase font-black border-none",
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                          order.status === 'arriving-today' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {(order.status || 'pending').replace('-', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Price & Actions */}
                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-4 w-full md:w-auto">
                    <div className="text-center md:text-right mr-0 md:mr-8 mb-2 md:mb-0">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Order Value</p>
                      <p className="text-xl md:text-2xl font-black text-primary">Rs.{order.totalAmount?.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="rounded-2xl h-12 w-full sm:w-auto px-6 font-bold gap-2">
                            <Info className="w-4 h-4" /> <span className="hidden sm:inline">Order</span> Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] md:max-w-2xl bg-white rounded-[2rem] md:rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
                          <div className="bg-primary p-6 md:p-8 text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <DialogHeader>
                              <DialogTitle className="text-2xl md:text-3xl font-black">Order Details</DialogTitle>
                            </DialogHeader>
                            <p className="text-xs md:text-sm font-bold opacity-80 uppercase tracking-widest mt-2 truncate">Order ID: {order.id}</p>
                          </div>
                          
                          <div className="p-6 md:p-8 space-y-6 md:space-y-8 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Included Items</h4>
                              <OrderItemsList orderId={order.id} />
                            </div>

                            <Separator className="bg-gray-100" />

                            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Shipping Destination</h4>
                                <div className="p-4 md:p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"><MapPin className="w-3.5 h-3.5" /> Coordinates</div>
                                  <p className="text-sm font-bold leading-relaxed break-words">{order.shippingAddress}</p>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Summary</h4>
                                <div className="p-4 md:p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
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
                          <Button className="rounded-2xl h-12 w-full sm:w-auto px-6 font-black bg-primary gap-2 shadow-lg shadow-primary/20">
                            <Truck className="w-4 h-4" /> Track <span className="hidden sm:inline">Drop</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] md:max-w-2xl bg-white rounded-[2rem] md:rounded-[3rem] border-none p-6 md:p-10 shadow-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl md:text-3xl font-black text-center mb-4 md:mb-6">TRACKING SIGNAL</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-8 md:space-y-10 relative pl-2 md:pl-0">
                            {/* Timeline Line */}
                            <div className="absolute left-[35px] md:left-[27px] top-4 bottom-4 w-1 bg-gray-100" />
                            
                            <div className="flex gap-4 md:gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", "bg-primary text-white")}>
                                <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-black text-base md:text-lg">Drop Confirmed</h4>
                                  <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Step 01</span>
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'} • System Synchronized</p>
                                
                                {order.status !== 'delivered' && order.status !== 'arriving-today' && order.expectedDeliveryDate && (
                                  <div className="flex items-center gap-2 mt-2 text-primary font-bold text-[10px] md:text-xs uppercase tracking-wider">
                                    <Clock className="w-3 h-3" /> Expected: {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-4 md:gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", ['shipped', 'arriving-today', 'delivered'].includes(order.status) ? "bg-primary text-white" : "bg-gray-100 text-gray-300")}>
                                <Truck className="w-6 h-6 md:w-7 md:h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-base md:text-lg">In Transit</h4>
                                {['shipped', 'arriving-today', 'delivered'].includes(order.status) ? (
                                  <div className="space-y-1">
                                    <p className="text-xs md:text-sm text-muted-foreground">Moving via Global Express</p>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Partner: {order.deliveryPartner || 'Standard Logistics'}</p>
                                      <p className="text-xs font-bold text-gray-900 mt-0.5">Tracking ID: {order.trackingId || 'Pending Registry'}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs md:text-sm text-muted-foreground">Preparing for departure...</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-4 md:gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", ['arriving-today', 'delivered'].includes(order.status) ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-300")}>
                                <Search className="w-6 h-6 md:w-7 md:h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-base md:text-lg">Arriving Today</h4>
                                {order.status === 'arriving-today' ? (
                                  <Badge className="bg-purple-100 text-purple-700 border-none px-3 py-1 mt-1 animate-pulse">ACTIVE SIGNAL</Badge>
                                ) : (
                                  <p className="text-xs md:text-sm text-muted-foreground">Awaiting local dispatch</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-4 md:gap-6 relative z-10">
                              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all", order.status === 'delivered' ? "bg-green-500 text-white" : "bg-gray-100 text-gray-300")}>
                                <Package className="w-6 h-6 md:w-7 md:h-7" />
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className="font-black text-base md:text-lg">Delivered</h4>
                                {order.status === 'delivered' ? (
                                  <div className="space-y-1">
                                    <p className="text-xs md:text-sm text-green-600 font-bold">Protocol Finalized</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">
                                      Arrived on {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs md:text-sm text-muted-foreground">Pending final arrival</p>
                                )}
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
