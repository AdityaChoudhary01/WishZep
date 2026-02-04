
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    initiateEmailSignUp(auth, email, password);
    toast({
      title: "Creating account...",
      description: "You'll be redirected shortly.",
    });
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6 -rotate-6">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-black">Create Account</h1>
          <p className="text-muted-foreground">Join the WishZep aura collective</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Full Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                className="glass h-14 pl-12 rounded-2xl bg-white/30 border-white/20 focus:border-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="glass h-14 pl-12 rounded-2xl bg-white/30 border-white/20 focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="glass h-14 pl-12 rounded-2xl bg-white/30 border-white/20 focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20 gap-2">
            Register Now <ArrowRight className="w-5 h-5" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/auth/login" className="text-primary font-bold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
