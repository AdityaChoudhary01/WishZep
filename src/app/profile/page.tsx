
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from '@/firebase';
import { collection, orderBy, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { Package, History, LogOut, ChevronRight, Camera, Loader2, Edit3, Save, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

  // Query root-level orders collection filtered by userId
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('orderDate', 'desc')
    );
  }, [db, user]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "Successfully signed out of your account.",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
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
      toast({ title: "Profile updated! ✨", description: "Your new photo is live." });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Upload failed", 
        description: error.message 
      });
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
      toast({ title: "Profile updated! ✨", description: "Your name has been saved." });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Failed to update name", 
        description: error.message 
      });
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Charging profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const profileImage = profileData?.profileImageUrl || user.photoURL || `https://picsum.photos/seed/${user.uid}/200`;

  return (
    <div className="container mx-auto px-6 py-12 space-y-12">
      <header className="flex flex-col md:flex-row items-center gap-8 glass p-10 rounded-[3rem]">
        <div className="relative group">
          <Avatar className="w-32 h-32 border-4 border-primary shadow-2xl transition-transform group-hover:scale-105">
            <AvatarImage src={profileImage} className="object-cover" />
            <AvatarFallback className="text-4xl font-black bg-primary/10">{user.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          {isEditingName ? (
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Input 
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter your name"
                className="max-w-xs h-12 rounded-xl glass border-primary/30"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveName} className="rounded-xl h-12 bg-primary"><Save className="w-4 h-4 mr-2" /> Save</Button>
                <Button variant="ghost" onClick={() => setIsEditingName(false)} className="rounded-xl h-12"><CloseIcon className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h1 className="text-4xl font-black min-h-[1em]">
                {profileData?.displayName || ''}
              </h1>
              <p className="text-muted-foreground font-medium">{user.email}</p>
            </div>
          )}
          
          <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">Member</Badge>
            <Badge variant="outline" className="glass">Status: Active</Badge>
          </div>
        </div>
        
        <div className="flex gap-4">
          {!isEditingName && (
            <Button variant="outline" className="rounded-xl glass gap-2" onClick={() => setIsEditingName(true)}>
              <Edit3 className="w-4 h-4" /> Edit Name
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="rounded-xl text-destructive hover:bg-destructive/10 gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </header>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="glass bg-white/20 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="orders" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <History className="w-4 h-4 mr-2" /> Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {ordersLoading ? (
            <div className="py-20 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Loading history...</div>
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
                      <p className="text-xl font-black">Rs.{order.totalAmount?.toLocaleString()}</p>
                    </div>
                    <Badge className={
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }>
                      {order.status?.toUpperCase() || 'PENDING'}
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
      </Tabs>
    </div>
  );
}
