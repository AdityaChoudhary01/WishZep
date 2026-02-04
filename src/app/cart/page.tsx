
"use client";

import { useCartStore } from '@/lib/store';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-20 text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl font-black">Your bag is <span className="aura-text">empty.</span></h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Time to fill it with some aura-charged gear. Explore our latest drops and find your next favorite piece.
        </p>
        <Link href="/products" className="inline-block">
          <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 px-10 h-14 text-lg">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-5xl font-black mb-12">SHOPPING <span className="aura-text">BAG</span></h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* List */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="glass rounded-3xl p-6 flex flex-col md:flex-row gap-6">
              <div className="relative w-full md:w-32 aspect-square rounded-2xl overflow-hidden bg-muted">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.selectedSize && `Size: ${item.selectedSize}`} 
                      {item.selectedSize && item.selectedColor && ' • '}
                      {item.selectedColor && `Color: ${item.selectedColor}`}
                    </p>
                  </div>
                  <p className="text-xl font-black text-primary">${item.price}</p>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center glass rounded-xl px-2 h-10">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:text-primary"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:text-primary"><Plus className="w-3 h-3" /></button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] p-8 space-y-6 sticky top-24 shadow-2xl shadow-primary/10">
            <h2 className="text-2xl font-black border-b border-white/20 pb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="text-green-500 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <Separator className="bg-white/20" />
              <div className="flex justify-between text-2xl font-black">
                <span>Total</span>
                <span className="aura-text">${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="pt-4 space-y-4">
              <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold gap-2 group">
                Checkout Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3 h-3" /> Secure payment powered by Razorpay
              </div>
            </div>
          </div>
          
          <div className="glass rounded-3xl p-6">
            <p className="text-sm font-bold mb-4">ACCEPTED CARDS</p>
            <div className="flex gap-4 items-center opacity-50 grayscale hover:grayscale-0 transition-all">
              <span className="font-bold text-xs">VISA</span>
              <span className="font-bold text-xs">MASTERCARD</span>
              <span className="font-bold text-xs">AMEX</span>
              <span className="font-bold text-xs">UPI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
