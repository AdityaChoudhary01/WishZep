
"use client";

import { useCartStore } from '@/lib/store';
import { useUser, useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Truck, 
  ArrowRight, 
  Loader2, 
  User, 
  MapPin, 
  Building2, 
  Hash, 
  ShieldCheck, 
  Phone, 
  PhoneCall 
} from 'lucide-react';
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
import Image from 'next/image';

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
    contactNumber: '',
    secondaryContact: '',
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

    if (!shipping.fullName || !shipping.contactNumber || !shipping.address || !shipping.city || !shipping.zip) {
      toast({ title: "Missing Protocols", description: "Please complete all mandatory shipping fields.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const orderRef = doc(collection(db, 'orders'));
    
    // Save order root details
    setDocumentNonBlocking(orderRef, {
      userId: user.uid,
      orderDate: new Date().toISOString(),
      totalAmount: total,
      status: 'pending',
      shippingDetails: {
        fullName: shipping.fullName,
        contactNumber: shipping.contactNumber,
        secondaryContact: shipping.secondaryContact,
        address: shipping.address,
        city: shipping.city,
        zip: shipping.zip
      },
      shippingAddress: `${shipping.address}, ${shipping.city} - ${shipping.zip}`,
      paymentMethod: 'Credit Card',
      createdAt: serverTimestamp()
    }, { merge: true });

    // Save individual items into subcollection
    items.forEach(item => {
      const itemRef = doc(collection(db, 'orders', orderRef.id, 'order_items'));
      setDocumentNonBlocking(itemRef, {
        orderId: orderRef.id,
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image: item.image
      }, { merge: true });
    });
    
    toast({ title: "Order Placed! ✨", description: "Your artifacts are being prepared for dispatch." });
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
        <div className="space-y-10">
          <section className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -mr-16 -mt-16" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Shipping Details</h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Destination Protocols</p>
              </div>
            </div>

            <div className="grid gap-8 relative z-10">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-primary flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Recipient Name
                </Label>
                <Input 
                  className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                  value={shipping.fullName} 
                  onChange={(e) => setShipping({...shipping, fullName: e.target.value})} 
                  placeholder="e.g. Aditya Choudhary" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-primary flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Primary Contact
                  </Label>
                  <Input 
                    type="tel"
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.contactNumber} 
                    onChange={(e) => setShipping({...shipping, contactNumber: e.target.value})} 
                    placeholder="98765 43210" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-gray-500 flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5" /> Secondary (Optional)
                  </Label>
                  <Input 
                    type="tel"
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.secondaryContact} 
                    onChange={(e) => setShipping({...shipping, secondaryContact: e.target.value})} 
                    placeholder="Emergency Backup" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-primary flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Street Address
                </Label>
                <Input 
                  className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                  value={shipping.address} 
                  onChange={(e) => setShipping({...shipping, address: e.target.value})} 
                  placeholder="House No, Street, Landmark" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-primary flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> City
                  </Label>
                  <Input 
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.city} 
                    onChange={(e) => setShipping({...shipping, city: e.target.value})} 
                    placeholder="Bangalore" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-primary flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> PIN Code
                  </Label>
                  <Input 
                    type="number"
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-bold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.zip} 
                    onChange={(e) => setShipping({...shipping, zip: e.target.value})} 
                    placeholder="560001" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shadow-lg">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Payment Gateway</h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Financial Interface</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex justify-between items-center group cursor-pointer hover:bg-white hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-black rounded flex items-center justify-center text-white text-[10px] font-black shadow-lg">VISA</div>
                <div className="space-y-0.5">
                  <span className="font-black text-sm block text-gray-900">•••• •••• •••• 4242</span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Exp: 12/26</span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase tracking-widest">Active</Badge>
            </div>

            <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-4">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Fully Encrypted Transmission
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-[3rem] p-10 space-y-10 shadow-3xl border border-gray-100 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 blur-[80px] -ml-24 -mb-24" />
            
            <h2 className="text-3xl font-black relative z-10 text-gray-900">Order Summary</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                {items.map(item => (
                  <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between items-center gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden relative border border-gray-100">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-black text-sm group-hover:text-primary transition-colors text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.quantity}x • {item.selectedSize || 'Standard'}</p>
                      </div>
                    </div>
                    <span className="font-black text-sm text-gray-900">Rs.{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <Separator className="bg-gray-100" />

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-gray-900">Rs.{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Logistics</span>
                  <span className="text-green-500">FREE</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-baseline">
                <span className="text-2xl font-black text-gray-900">Total</span>
                <span className="text-5xl font-black wishzep-text">Rs.{total.toLocaleString()}</span>
              </div>
            </div>

            <Button 
              onClick={handlePlaceOrder}
              disabled={isProcessing || !shipping.address || !shipping.fullName || !shipping.contactNumber}
              className="w-full h-20 rounded-[2rem] bg-primary hover:bg-primary/90 text-2xl font-black gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all relative z-10"
            >
              {isProcessing ? <><Loader2 className="w-8 h-8 animate-spin" /> Processing...</> : <>Place Order <ArrowRight className="w-8 h-8" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
