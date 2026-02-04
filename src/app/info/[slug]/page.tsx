
"use client";

import { useParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { sendContactEmail } from '@/app/actions/contact';
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  FileText, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DynamicInfoPage() {
  const { slug } = useParams();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const pagesQuery = useMemoFirebase(() => {
    if (!db || !slug) return null;
    return query(collection(db, 'pages'), where('slug', '==', slug), limit(1));
  }, [db, slug]);

  const { data: pages, isLoading } = useCollection(pagesQuery);
  const page = pages?.[0];

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.currentTarget);
    const result = await sendContactEmail(formData);

    if (result.success) {
      toast({
        title: "Message Sent! 🚀",
        description: "Your message has been received. We'll get back to you shortly.",
      });
      (e.target as HTMLFormElement).reset();
    } else {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: result.error || "Something went wrong while sending your message.",
      });
    }
    setIsSending(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-20 space-y-8 max-w-4xl">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
        </div>
      </div>
    );
  }

  const renderTemplate = () => {
    switch (slug) {
      case 'about':
        return (
          <div className="space-y-24 animate-fade-in">
            <header className="text-center space-y-6 max-w-3xl mx-auto">
              <Badge className="bg-primary/20 text-primary px-4 py-1 rounded-full border-primary/20">The WishZep Vision</Badge>
              <h1 className="text-7xl font-black tracking-tighter leading-none">
                DEFINING THE <span className="wishzep-text">FUTURE</span> OF SHOPPING.
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                WishZep isn't just a store. It's a curated ecosystem for the modern visionary who demands performance, style, and attitude in every drop.
              </p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "High Velocity", desc: "We move at the speed of culture, bringing you the latest drops before they hit the mainstream." },
                { icon: Sparkles, title: "Curated Energy", desc: "Every item in our catalogue is hand-vetted for quality, design, and that unique WishZep vibe." },
                { icon: ShieldCheck, title: "Elite Service", desc: "Your experience is our priority. From browsing to unboxing, we ensure perfection." }
              ].map((feature, i) => (
                <div key={i} className="glass p-10 rounded-[2.5rem] space-y-6 hover:-translate-y-2 transition-transform duration-500">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            <section className="glass rounded-[3rem] p-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl font-black">Our Global Footprint</h2>
                  <p className="text-lg text-muted-foreground">
                    Based in the digital heart of innovation, WishZep serves a global community of dreamers and doers. We are committed to sustainable sourcing and revolutionary logistics that minimize our footprint while maximizing your satisfaction.
                  </p>
                  <Button className="rounded-full px-8 h-12 bg-primary">Join the Community</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-48 glass rounded-2xl bg-[url('https://picsum.photos/seed/about1/400/400')] bg-cover" />
                  <div className="h-48 glass rounded-2xl bg-[url('https://picsum.photos/seed/about2/400/400')] bg-cover mt-8" />
                </div>
              </div>
            </section>
          </div>
        );

      case 'contact':
        return (
          <div className="grid lg:grid-cols-2 gap-16 animate-fade-in">
            <div className="space-y-12">
              <div className="space-y-6">
                <Badge className="bg-secondary/20 text-secondary px-4 py-1 rounded-full border-secondary/20">24/7 Support</Badge>
                <h1 className="text-7xl font-black tracking-tighter leading-none">
                  GET IN <span className="wishzep-text">TOUCH.</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Have a question about a drop or an existing order? Our team is standing by to assist you.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: Mail, label: "Email", value: "support@wishzep.com" },
                  { icon: Phone, label: "Phone", value: "+1 (888) WISH-ZEP" },
                  { icon: MapPin, label: "HQ", value: "Innovation District, SF, CA" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-6 group cursor-pointer">
                    <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                      <p className="text-xl font-bold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] shadow-2xl">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-widest ml-1">Full Name</label>
                  <Input 
                    name="name"
                    required
                    placeholder="John Doe" 
                    className="h-14 rounded-2xl glass border-white/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-widest ml-1">Email Address</label>
                  <Input 
                    name="email"
                    required
                    type="email"
                    placeholder="john@example.com" 
                    className="h-14 rounded-2xl glass border-white/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-widest ml-1">Message</label>
                  <Textarea 
                    name="message"
                    required
                    placeholder="How can we help?" 
                    className="min-h-[150px] rounded-2xl glass border-white/20" 
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={isSending}
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-xl font-bold gap-3"
                >
                  {isSending ? 'Sending...' : 'Send Message'} <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </div>
        );

      case 'shipping':
      case 'refund':
      case 'privacy':
      case 'terms':
        return (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center text-primary shadow-xl">
                {slug === 'shipping' && <Truck className="w-10 h-10" />}
                {slug === 'refund' && <RotateCcw className="w-10 h-10" />}
                {slug === 'privacy' && <ShieldCheck className="w-10 h-10" />}
                {slug === 'terms' && <FileText className="w-10 h-10" />}
              </div>
              <div>
                <h1 className="text-6xl font-black tracking-tighter">
                  {slug === 'shipping' ? "Shipping Policy" : slug === 'refund' ? "Refund Policy" : slug === 'privacy' ? "Privacy Policy" : "Terms & Conditions"}
                </h1>
                <p className="text-muted-foreground font-medium uppercase tracking-widest">Effective: January 2024</p>
              </div>
            </div>

            <div className="glass rounded-[3rem] p-12 prose prose-lg dark:prose-invert max-w-none space-y-8">
              {page ? (
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <div className="space-y-8">
                  <section>
                    <h3 className="text-2xl font-bold mb-4">1. Overview</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      At WishZep, we prioritize clarity and speed. Our policies are designed to ensure you spend less time reading fine print and more time enjoying your gear.
                    </p>
                  </section>
                  <section>
                    <h3 className="text-2xl font-bold mb-4">2. Core Principles</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We believe in transparency and fairness. Every policy we draft is focused on providing a seamless experience for the WishZep community.
                    </p>
                  </section>
                  <div className="p-8 bg-primary/5 border border-primary/10 rounded-2xl">
                    <p className="text-primary font-bold italic">"Innovation requires trust. We're here to build that trust every single day."</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="max-w-4xl mx-auto py-24 text-center space-y-8">
            <h1 className="text-6xl font-black">{page?.title || "Page Not Found"}</h1>
            <p className="text-xl text-muted-foreground">The content you are looking for is currently being curated.</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-6 py-20 min-h-screen">
      {renderTemplate()}
    </div>
  );
}
