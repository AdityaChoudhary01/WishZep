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
  Sparkles,
  Globe,
  Clock,
  CheckCircle2,
  Lock,
  Eye,
  Scale,
  Code2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DynamicInfoPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0];
  
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
    if (!slug) return null;

    switch (slug) {
      case 'about':
        return (
          <div className="space-y-32 animate-fade-in">
            {/* Hero */}
            <header className="text-center space-y-8 max-w-4xl mx-auto">
              <Badge className="bg-primary/20 text-primary px-6 py-2 rounded-full border-primary/20 text-sm font-bold tracking-widest uppercase">The WishZep Standard</Badge>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none">
                CRAFTING <span className="wishzep-text">LEGENDS.</span>
              </h1>
              <p className="text-2xl text-muted-foreground leading-relaxed font-light">
                WishZep is the ultimate destination for the modern visionary. We don't just sell products; we curate high-energy artifacts that define an era of performance and style.
              </p>
            </header>

            {/* Core Values */}
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: Zap, title: "Velocity First", desc: "We anticipate the shift in culture, delivering the next generation of gear before it hits the mainstream." },
                { icon: Sparkles, title: "Curated Energy", desc: "Every drop is hand-selected for its unique frequency, quality, and undeniable WishZep edge." },
                { icon: ShieldCheck, title: "Absolute Trust", desc: "From hyper-secure checkouts to elite customer care, your satisfaction is our baseline." }
              ].map((feature, i) => (
                <div key={i} className="glass p-12 rounded-[3rem] space-y-8 hover:-translate-y-4 transition-all duration-700 group">
                  <div className="w-20 h-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <feature.icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Narrative Section */}
            <section className="relative overflow-hidden glass rounded-[4rem] p-12 md:p-24">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] -mr-64 -mt-64" />
              <div className="grid lg:grid-cols-2 gap-20 items-center relative z-10">
                <div className="space-y-10">
                  <h2 className="text-5xl font-black leading-tight">THE <span className="wishzep-text">REVOLUTION</span> OF RETAIL.</h2>
                  <div className="space-y-6 text-xl text-muted-foreground leading-relaxed">
                    <p>
                      WishZep was born from a simple observation: the digital shopping experience had become stale. It lacked the adrenaline, the soul, and the curation that high-performance individuals demand.
                    </p>
                    <p>
                      We built WishZep to be more than a store. It's a sanctuary for the dreamers, the hackers, the athletes, and the artists who refuse to settle for the average.
                    </p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-5xl font-black wishzep-text">50K+</p>
                      <p className="text-sm font-bold uppercase tracking-widest mt-2">Visionaries Served</p>
                    </div>
                    <div className="border-l border-white/20 pl-8">
                      <p className="text-5xl font-black wishzep-text">120+</p>
                      <p className="text-sm font-bold uppercase tracking-widest mt-2">Exclusive Drops</p>
                    </div>
                  </div>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-[3rem] group-hover:bg-primary/20 transition-all" />
                  <div className="relative aspect-square glass rounded-[3rem] overflow-hidden">
                    <img src="https://picsum.photos/seed/about-vision/800/800" alt="Vision" className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                  </div>
                </div>
              </div>
            </section>

            {/* Developer Section */}
            <section className="text-center space-y-16">
              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter">THE <span className="wishzep-text">ARCHITECT.</span></h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
                  The visionary behind the WishZep experience, dedicated to pushing the boundaries of digital craft and high-performance design.
                </p>
              </div>
              <div className="max-w-md mx-auto aspect-[3/4] glass rounded-[4rem] overflow-hidden relative group border-2 border-primary/20 shadow-2xl shadow-primary/10">
                <img 
                  src="https://picsum.photos/seed/aditya-dev/800/1000" 
                  alt="Aditya Choudhary" 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-1000" 
                  data-ai-hint="portrait man"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 text-left space-y-3">
                  <Badge className="bg-primary text-white border-none px-4 py-1 text-[10px] uppercase font-black tracking-[0.2em]">Lead Developer</Badge>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-white leading-none tracking-tight">Aditya Choudhary</h3>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">Founder & Digital Architect</p>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <div className="w-8 h-8 rounded-lg glass-dark flex items-center justify-center text-white/80 hover:text-white transition-colors">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg glass-dark flex items-center justify-center text-white/80 hover:text-white transition-colors">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'contact':
        return (
          <div className="grid lg:grid-cols-2 gap-24 animate-fade-in items-start">
            <div className="space-y-16">
              <div className="space-y-8">
                <Badge className="bg-secondary/20 text-secondary px-6 py-2 rounded-full border-secondary/20 text-sm font-bold tracking-widest">Available 24/7/365</Badge>
                <h1 className="text-8xl font-black tracking-tighter leading-none">
                  JOIN THE <span className="wishzep-text">DIALOGUE.</span>
                </h1>
                <p className="text-2xl text-muted-foreground leading-relaxed">
                  Whether you have a question about a drop, a suggestion for the platform, or need high-priority order support, our team is always on standby.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-10">
                {[
                  { icon: Mail, label: "Official Support", value: "support@wishzep.com", desc: "Best for order inquiries." },
                  { icon: Phone, label: "Direct Line", value: "+1 (888) WISH-ZEP", desc: "Mon-Fri, 9AM-6PM PT." },
                  { icon: Globe, label: "Global HQ", value: "Innovation Dist, SF", desc: "Where the magic happens." },
                  { icon: Clock, label: "Response Time", value: "< 2 Hours", desc: "Our average reply time." }
                ].map((item, i) => (
                  <div key={i} className="space-y-4 group cursor-pointer">
                    <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-xl group-hover:shadow-primary/30">
                      <item.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-xl font-black">{item.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 glass rounded-[2.5rem] border-primary/20 bg-primary/5">
                <div className="flex items-center gap-4 mb-4">
                  <CheckCircle2 className="text-primary w-6 h-6" />
                  <p className="text-lg font-bold">Priority Support for Members</p>
                </div>
                <p className="text-muted-foreground">Logged-in members receive accelerated response times and direct access to our specialist team.</p>
              </div>
            </div>

            <div className="glass p-12 rounded-[4rem] shadow-2xl relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/20 blur-[80px]" />
              <form onSubmit={handleContactSubmit} className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Full Name</label>
                    <Input name="name" required placeholder="John Doe" className="h-16 rounded-2xl glass border-white/20 bg-white/10 focus:bg-white/20 transition-all text-lg" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Email Address</label>
                    <Input name="email" required type="email" placeholder="john@example.com" className="h-16 rounded-2xl glass border-white/20 bg-white/10 focus:bg-white/20 transition-all text-lg" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Subject</label>
                  <Input name="subject" placeholder="What's this about?" className="h-16 rounded-2xl glass border-white/20 bg-white/10 focus:bg-white/20 transition-all text-lg" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Message</label>
                  <Textarea name="message" required placeholder="How can we help you achieve your vision?" className="min-h-[200px] rounded-3xl glass border-white/20 bg-white/10 focus:bg-white/20 transition-all text-lg p-6" />
                </div>
                <Button type="submit" disabled={isSending} className="w-full h-20 rounded-[2rem] bg-primary hover:bg-primary/90 text-2xl font-black gap-4 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]">
                  {isSending ? 'Transmitting...' : 'Send Message'} <Send className="w-6 h-6" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">By submitting, you agree to our response protocol and privacy guidelines.</p>
              </form>
            </div>
          </div>
        );

      case 'refund':
        return (
          <div className="max-w-5xl mx-auto space-y-20 animate-fade-in">
             <header className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-32 h-32 glass rounded-[2.5rem] flex items-center justify-center text-destructive shadow-2xl shrink-0">
                <AlertCircle className="w-16 h-16" />
              </div>
              <div className="text-center md:text-left space-y-4">
                <Badge variant="destructive" className="px-6 py-1 rounded-full uppercase font-black tracking-widest">Final Sale Policy</Badge>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">NO RETURNS. <br/><span className="wishzep-text">EXCLUSIVITY FIRST.</span></h1>
                <p className="text-xl text-muted-foreground uppercase tracking-[0.2em] font-bold">WishZep Official Policy • v.2.4.0</p>
              </div>
            </header>

            <div className="glass rounded-[4rem] p-12 md:p-20 space-y-16">
              <section className="space-y-8">
                <h2 className="text-4xl font-black tracking-tight">The "Final Sale" Directive</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  At WishZep, we operate on a high-velocity drop model. To maintain the integrity and hygiene of our limited-edition performance gear, all sales are final. We do not offer returns, refunds, or exchanges under any circumstances once an order has been successfully processed.
                </p>
                <div className="p-8 bg-destructive/5 border border-destructive/20 rounded-[2rem] flex items-start gap-6">
                  <AlertCircle className="w-8 h-8 text-destructive shrink-0 mt-1" />
                  <div>
                    <h4 className="text-xl font-bold text-destructive mb-2">Zero Exception Protocol</h4>
                    <p className="text-muted-foreground">This policy applies to all products, including footwear, audio equipment, and apparel. We encourage you to review size guides and product descriptions carefully before initiating a drop.</p>
                  </div>
                </div>
              </section>

              <Separator className="bg-white/10" />

              <section className="space-y-8">
                <h2 className="text-4xl font-black tracking-tight">Quality Assurance</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Every WishZep artifact undergoes a rigorous 12-point inspection before it leaves our vault. In the highly unlikely event that you receive a defective item, please contact our Priority Support team within 24 hours of delivery with photographic evidence.
                </p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-8 glass rounded-[2rem] space-y-4">
                    <h4 className="text-2xl font-bold">Defect Reports</h4>
                    <p className="text-muted-foreground">Must be filed via the Contact Dialogue within 24 hours. Reports filed after this window will not be considered.</p>
                  </div>
                  <div className="p-8 glass rounded-[2rem] space-y-4">
                    <h4 className="text-2xl font-bold">Resolution Path</h4>
                    <p className="text-muted-foreground">Verified defects will be handled with a direct replacement or platform credit at the sole discretion of the WishZep Logistics team.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 'shipping':
      case 'privacy':
      case 'terms':
        const titles = {
          shipping: { title: "Global Logistics & Shipping", icon: Truck, badge: "Ultra-Fast Delivery" },
          privacy: { title: "Data Security & Privacy", icon: Lock, badge: "Encrypted Protection" },
          terms: { title: "Usage Terms & Conditions", icon: Scale, badge: "Legal Framework" }
        };
        const active = titles[slug as keyof typeof titles];

        return (
          <div className="max-w-5xl mx-auto space-y-20 animate-fade-in">
            <header className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-32 h-32 glass rounded-[2.5rem] flex items-center justify-center text-primary shadow-2xl shrink-0">
                <active.icon className="w-16 h-16" />
              </div>
              <div className="text-center md:text-left space-y-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-6 py-1 rounded-full">{active.badge}</Badge>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">{active.title}</h1>
                <p className="text-xl text-muted-foreground uppercase tracking-[0.2em] font-bold">WishZep Official Policy • v.2.4.0</p>
              </div>
            </header>

            <div className="glass rounded-[4rem] p-12 md:p-20 space-y-16">
              {page ? (
                <div className="prose prose-2xl prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:text-muted-foreground prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: page.content }} />
              ) : (
                <div className="space-y-20">
                  <section className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xl">01</div>
                      <h2 className="text-4xl font-black tracking-tight">Mission & Transparency</h2>
                    </div>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                      At WishZep, transparency isn't a goal—it's an absolute. We have architected our policies to be as high-performance as our products. No hidden clauses, no legal jargon that confuses. Just clear, concise guidelines that protect both you and the WishZep community.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  <section className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-black text-xl">02</div>
                      <h2 className="text-4xl font-black tracking-tight">Executive Summary</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="p-8 glass rounded-[2rem] border-white/5 space-y-4">
                        <h4 className="text-2xl font-bold">Speed of Execution</h4>
                        <p className="text-muted-foreground">Whether it's shipping out your order or processing a request, we operate at a high-velocity frequency. Efficiency is our obsession.</p>
                      </div>
                      <div className="p-8 glass rounded-[2rem] border-white/5 space-y-4">
                        <h4 className="text-2xl font-bold">Global Compatibility</h4>
                        <p className="text-muted-foreground">Our policies are designed to work seamlessly across borders, respecting both local regulations and our global community standards.</p>
                      </div>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  <section className="space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent font-black text-xl">03</div>
                      <h2 className="text-4xl font-black tracking-tight">Detailed Directives</h2>
                    </div>
                    <div className="space-y-10">
                      {[
                        { q: "What defines our approach?", a: "We prioritize user empowerment. Every decision in our logistics and legal chain is made to ensure you have maximum control over your WishZep experience." },
                        { q: "How do we handle changes?", a: "The world moves fast, and so do we. Any updates to these policies are communicated instantly via the platform, ensuring you are always operating with the latest information." },
                        { q: "Our commitment to security?", a: "We utilize industry-leading encryption and verification protocols for every interaction. Your data and your trust are our most valuable assets." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-4">
                          <h4 className="text-2xl font-black text-primary">{item.q}</h4>
                          <p className="text-lg text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="p-12 bg-primary/10 border border-primary/20 rounded-[3rem] text-center space-y-6">
                    <Sparkles className="w-12 h-12 text-primary mx-auto" />
                    <h3 className="text-3xl font-black italic">"Innovation requires absolute trust. We are here to earn it every single day."</h3>
                    <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">— The WishZep Legal Team</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="max-w-4xl mx-auto py-32 text-center space-y-12">
            <h1 className="text-8xl font-black tracking-tighter">{page?.title || "UNRESOLVED ROUTE"}</h1>
            <p className="text-2xl text-muted-foreground font-light">The content you are seeking is currently being recalibrated by our team. Check back shortly.</p>
            <Button asChild size="lg" className="rounded-full px-12 h-16 text-xl bg-primary">
              <a href="/">Back to Command Center</a>
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-6 py-24 min-h-screen">
      {renderTemplate()}
    </div>
  );
}
