
import Link from 'next/link';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Footer() {
  return (
    <footer className="bg-white/50 border-t border-white/20 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <span className="text-xl font-bold font-headline aura-text">WishZep</span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Charging your lifestyle with aura. Premium curated gear for the modern visionary. Experience the future of e-commerce.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-6">Shop</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li><Link href="/products" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link href="/products?category=new" className="hover:text-primary transition-colors">New Arrivals</Link></li>
            <li><Link href="/products?category=sale" className="hover:text-primary transition-colors">Sale</Link></li>
            <li><Link href="/collections" className="hover:text-primary transition-colors">Collections</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li><Link href="/info/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/info/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link href="/info/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
            <li><Link href="/info/refund" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            <li><Link href="/info/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="/info/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6">Stay Updated</h4>
          <p className="text-sm text-muted-foreground mb-4">Subscribe to get notifications about new launches and sales.</p>
          <div className="flex gap-2">
            <Input placeholder="Enter email" className="glass bg-white/30" />
            <Button size="icon" className="bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/20 mt-20 pt-8 flex flex-col md:row justify-between items-center gap-4 text-xs text-muted-foreground">
        <p>© 2024 WishZep. All rights reserved.</p>
        <div className="flex gap-6">
          <span>Visa</span>
          <span>Mastercard</span>
          <span>Razorpay</span>
          <span>PayPal</span>
        </div>
      </div>
    </footer>
  );
}
