
import Link from 'next/link';

const WishZepLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="url(#footer_logo_gradient)" />
    <path d="M25 30L40 70L50 45L60 70L75 30" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="footer_logo_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#BE29EC" />
        <stop offset="1" stopColor="#29A6EC" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-white/50 border-t border-white/20 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2">
            <WishZepLogo className="w-8 h-8" />
            <span className="text-xl font-bold font-headline wishzep-text">WishZep</span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Charging your lifestyle with WishZep. Premium curated gear for the modern visionary. Experience the future of e-commerce.
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
