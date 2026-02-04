
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Github, Chrome } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 rotate-6">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-black">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your WishZep account</p>
        </div>

        <div className="space-y-4">
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
          <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20">
            Get Magic Link
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="glass px-2 text-muted-foreground">Or continue with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="glass h-14 rounded-2xl gap-2 font-bold hover:bg-white/50">
            <Chrome className="w-5 h-5 text-red-500" /> Google
          </Button>
          <Button variant="outline" className="glass h-14 rounded-2xl gap-2 font-bold hover:bg-white/50">
            <Github className="w-5 h-5" /> GitHub
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          New to WishZep? <Link href="/auth/register" className="text-primary font-bold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
