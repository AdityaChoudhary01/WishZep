
"use client";

import { useCartStore } from '@/lib/store';
import { useUser, useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { CreditCard, Truck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const total = getTotal();

  const [isProcessing, setIsProcessing] = useState(false);
  const [shipping, setShipping] = useState({
    fullName: '',
    address: '',
    city: '',
    zip: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePlaceOrder = () => {
    if (!user || !db) {
      toast({ title: "Please sign in to place order", variant: "destructive" });
      router.push('/auth/login');
      return;
    }

    setIsProcessing(true);

    // 1. Pre-generate the Order ID at the ROOT level
    const orderRef = doc(collection(db, 'orders'));
    
    // 2. Queue the main order document
    setDocumentNonBlocking(orderRef, {
      userId: user.uid,
      orderDate: new Date().toISOString(),
      totalAmount: total,
      status: 'pending',
      shippingAddress: `${shipping.address}, ${shipping.city}, ${shipping.zip}`,
      paymentMethod: 'Credit Card',
      createdAt: serverTimestamp()
    }, { merge: true });

    // 3. Queue each order item using the pre-generated Order ID at the ROOT level
    items.forEach(item => {
      const itemRef = doc(collection(db, 'orders', orderRef.id, 'order_items'));
      setDocumentNonBlocking(itemRef, {
        orderId: orderRef.id,
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      }, { merge: true });
    });
    
    // 4. Optimistically update UI
    toast({ title: "Order Placed! ✨", description: "Your artifacts are being prepared." });
    clearCart();
    
    setTimeout(() => {
      router.push('/profile');
    }, 1500);
  };

  if (!mounted) {
    return <div className="p-20 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest">Preparing checkout...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="p-20 text-center space-y-6">
        <h2 className="text-3xl font-black">Your bag is empty.</h2>
        <Button asChild className="rounded-full">
          <Link href="/products">Go Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-5xl font-black mb-12">FINAL <span className="wishzep-text">CHECKOUT</span></h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-black">Shipping Details</h2>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="font-bold uppercase text-[10px] tracking-widest ml-1">Full Name</Label>
                <Input className="glass h-14 rounded-2xl bg-white/30 border-white/20" value={shipping.fullName} onChange={(e) => setShipping({...shipping, fullName: e.target.value})} placeholder="Aditya Choudhary" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold uppercase text-[10px] tracking-widest ml-1">Street Address</Label>
                <Input className="glass h-14 rounded-2xl bg-white/30 border-white/20" value={shipping.address} onChange={(e) => setShipping({...shipping, address: e.target.value})} placeholder="123 Innovation St" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest ml-1">City</Label>
                  <Input className="glass h-14 rounded-2xl bg-white/30 border-white/20" value={shipping.city} onChange={(e) => setShipping({...shipping, city: e.target.value})} placeholder="Bangalore" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest ml-1">ZIP Code</Label>
                  <Input className="glass h-14 rounded-2xl bg-white/30 border-white/20" value={shipping.zip} onChange={(e) => setShipping({...shipping, zip: e.target.value})} placeholder="560001" />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-secondary" /></div>
              <h2 className="text-2xl font-black">Payment Method</h2>
            </div>
            <div className="glass rounded-[2rem] p-8 space-y-4">
              <div className="flex justify-between items-center bg-white/20 p-4 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-black rounded-md flex items-center justify-center text-white text-[8px] font-bold">VISA</div>
                  <span className="font-bold text-sm">•••• •••• •••• 4242</span>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary">Default</Badge>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="glass rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
            <h2 className="text-3xl font-black">Order Summary</h2>
            <div className="space-y-4">
              {items.map(item => (
                <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground">{item.quantity}x {item.name} {item.selectedSize ? `(${item.selectedSize})` : ''}</span>
                  <span>Rs.{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <Separator className="bg-white/20" />
              <div className="flex justify-between text-3xl font-black pt-4"><span>Total</span><span className="wishzep-text">Rs.{total.toLocaleString()}</span></div>
            </div>

            <Button 
              onClick={handlePlaceOrder}
              disabled={isProcessing || !shipping.address || !shipping.fullName}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-bold gap-3 shadow-2xl shadow-primary/20"
            >
              {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Transmitting...</> : <>Place Order <ArrowRight className="w-6 h-6" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
