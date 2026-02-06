
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';

export default function Footer() {
  return (
    <footer className="bg-white/50 border-t border-white/20 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-6">
          <Link href="/" className="group inline-block">
            <BrandLogo size="md" className="group-hover:scale-105 transition-transform" />
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Charging your lifestyle with high-energy artifacts. Premium curated gear for the modern visionary.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-6">Shop</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li><Link href="/products" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link href="/products?category=new" className="hover:text-primary transition-colors">New Arrivals</Link></li>
            <li><Link href="/products?category=sale" className="hover:text-primary transition-colors">Sale</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li><Link href="/info/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/info/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link href="/info/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
            <li><Link href="/info/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="/info/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/20 mt-20 pt-8 flex flex-col justify-center items-center gap-4 text-xs text-muted-foreground">
        <p>© 2024 WishZep. All rights reserved.</p>
      </div>
    </footer>
  );
}
