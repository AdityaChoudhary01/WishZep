"use client";

import { useCartStore } from '@/lib/store';
import { useUser, useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { 
  Truck, 
  ArrowRight, 
  Loader2, 
  User, 
  MapPin, 
  Building2, 
  Hash, 
  ShieldCheck, 
  Phone, 
  PhoneCall, 
  IndianRupee, 
  WifiOff, 
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { createRazorpayOrder } from '@/app/actions/payments';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { items, getTotal, clearCart } = useCartStore();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const total = getTotal();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
   
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
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "You can now proceed with payment.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "destructive",
        title: "No Internet",
        description: "Please check your network connection.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const validateShipping = () => {
    if (!shipping.fullName || !shipping.contactNumber || !shipping.address || !shipping.city || !shipping.zip) {
      toast({ title: "Missing Details", description: "Please fill in all delivery address fields.", variant: "destructive" });
      return false;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(shipping.contactNumber)) {
      toast({ 
        title: "Invalid Phone Number", 
        description: "Please enter a valid 10-digit mobile number.", 
        variant: "destructive" 
      });
      return false;
    }

    const pinRegex = /^\d{6}$/;
    if (!pinRegex.test(shipping.zip)) {
      toast({ 
        title: "Invalid Pincode", 
        description: "Please enter a valid 6-digit Pincode.", 
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        title: "You are offline",
        description: "Please check your internet connection to continue.",
      });
      return;
    }

    const rzpKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!rzpKeyId) {
      toast({ title: "System Error", description: "Payment configuration missing. Contact support.", variant: "destructive" });
      return;
    }

    if (!user || !db) {
      toast({ title: "Login Required", description: "Please login to place your order.", variant: "destructive" });
      router.push('/auth/login');
      return;
    }

    if (!validateShipping()) return;

    setIsProcessing(true);

    try {
      const orderDataResult = await createRazorpayOrder(total);

      if (!orderDataResult.success || !orderDataResult.orderId) {
        throw new Error(orderDataResult.error || 'Could not start payment.');
      }

      const options = {
        key: rzpKeyId,
        amount: orderDataResult.amount,
        currency: 'INR',
        name: 'WishZep',
        // --- BRAND LOGO ---
        image: "https://res.cloudinary.com/dmtnonxtt/image/upload/v1770383164/oytykmuuhewune4jr7jz.png", 
        description: 'Payment for your order',
        order_id: orderDataResult.orderId,
        handler: function (response: any) {
          setIsSuccess(true);
          const orderRef = doc(collection(db, 'orders'));
           
          const orderPayload = {
            userId: user.uid,
            orderDate: new Date().toISOString(),
            totalAmount: total,
            status: 'pending',
            shippingDetails: { ...shipping, email: user.email }, 
            shippingAddress: `${shipping.address}, ${shipping.city} - ${shipping.zip}`,
            paymentMethod: 'Online Payment',
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            emailSent: false, 
            createdAt: serverTimestamp()
          };

          setDocumentNonBlocking(orderRef, orderPayload, { merge: true });

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

          toast({ 
            title: "Order Placed Successfully! 🎉", 
            description: "You will receive a confirmation email shortly." 
          });
           
          setTimeout(() => {
            clearCart();
            router.push('/profile');
          }, 1500);
        },
        prefill: {
          name: shipping.fullName,
          email: user.email, 
          contact: shipping.contactNumber,
        },
        // Passed to webhook
        notes: {
          email: user.email, 
          userId: user.uid,
          orderRef: "web_checkout"
        },
        theme: {
          color: "#BE29EC",
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast({
              variant: "destructive",
              title: "Payment Cancelled",
              description: "You closed the payment window.",
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error: any) {
      toast({ title: "Payment Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return <div className="p-20 text-center animate-pulse text-muted-foreground font-bold tracking-wide">Loading Checkout...</div>;
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto px-6 py-32 flex flex-col items-center justify-center space-y-8 animate-fade-in">
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black wishzep-text">ORDER CONFIRMED</h1>
          <p className="text-lg text-muted-foreground font-medium">Redirecting to My Orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
       
      {!isOnline && (
        <Alert variant="destructive" className="mb-8 rounded-3xl border-2 border-destructive animate-pulse bg-destructive/5 py-6">
          <WifiOff className="h-6 w-6" />
          <AlertTitle className="text-lg font-bold">You are offline</AlertTitle>
          <AlertDescription className="text-sm">
            Please check your internet connection to place the order.
          </AlertDescription>
        </Alert>
      )}

      <h1 className="text-4xl md:text-5xl font-black mb-12">SECURE <span className="wishzep-text">CHECKOUT</span></h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <section className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -mr-16 -mt-16" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Delivery Address</h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Where should we deliver?</p>
              </div>
            </div>

            <div className="grid gap-8 relative z-10">
              <div className="space-y-3">
                <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-primary flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Name
                </Label>
                <Input 
                  className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                  value={shipping.fullName} 
                  onChange={(e) => setShipping({...shipping, fullName: e.target.value})} 
                  placeholder="Enter your full name" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-primary flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </Label>
                  <Input 
                    type="tel"
                    maxLength={10}
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.contactNumber} 
                    onChange={(e) => setShipping({...shipping, contactNumber: e.target.value.replace(/\D/g, '')})} 
                    placeholder="10-digit mobile number" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-gray-500 flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5" /> Alternate Phone (Optional)
                  </Label>
                  <Input 
                    type="tel"
                    maxLength={10}
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.secondaryContact} 
                    onChange={(e) => setShipping({...shipping, secondaryContact: e.target.value.replace(/\D/g, '')})} 
                    placeholder="Backup number" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-primary flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Address
                </Label>
                <Input 
                  className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                  value={shipping.address} 
                  onChange={(e) => setShipping({...shipping, address: e.target.value})} 
                  placeholder="House No, Building, Street, Area" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-primary flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> City/District
                  </Label>
                  <Input 
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.city} 
                    onChange={(e) => setShipping({...shipping, city: e.target.value})} 
                    placeholder="e.g. Bangalore" 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold uppercase text-[10px] tracking-[0.1em] text-primary flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" /> Pincode
                  </Label>
                  <Input 
                    type="text"
                    maxLength={6}
                    className="h-14 rounded-2xl bg-gray-50 border-gray-200 text-lg font-semibold focus:bg-white focus:border-primary transition-all text-gray-900" 
                    value={shipping.zip} 
                    onChange={(e) => setShipping({...shipping, zip: e.target.value.replace(/\D/g, '')})} 
                    placeholder="e.g. 560001" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Secure Payment</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">100% Safe & Trusted</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay securely using UPI, Credit/Debit Cards, or NetBanking. All transactions are encrypted and secured.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-[3rem] p-10 space-y-10 shadow-3xl border border-gray-100 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 blur-[80px] -ml-24 -mb-24" />
            
            <h2 className="text-3xl font-black relative z-10 text-gray-900">Price Details</h2>
            
            <div className="space-y-6 relative z-10">
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden relative border border-gray-100">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm group-hover:text-primary transition-colors text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.quantity}x • Rs.{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-gray-900">Rs.{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <Separator className="bg-gray-100" />

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Price ({items.length} items)</span>
                  <span className="text-gray-900">Rs.{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Delivery Charges</span>
                  <span className="text-green-600">FREE</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-baseline">
                <span className="text-2xl font-bold text-gray-900">Total Payable</span>
                <span className="text-4xl font-black wishzep-text">Rs.{total.toLocaleString()}</span>
              </div>
            </div>

            <Button 
              onClick={handlePlaceOrder}
              disabled={isProcessing || !isOnline}
              className="w-full h-20 rounded-[2rem] bg-primary hover:bg-primary/90 text-2xl font-bold gap-4 shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all relative z-10 disabled:opacity-50 disabled:grayscale"
            >
              {isProcessing ? (
                <><Loader2 className="w-8 h-8 animate-spin" /> Processing...</>
              ) : !isOnline ? (
                <><WifiOff className="w-8 h-8" /> You are Offline</>
              ) : (
                <>Place Order <ArrowRight className="w-8 h-8" /></>
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-4 relative z-10">
              <IndianRupee className="w-3 h-3" /> Safe and Secure Payments
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
