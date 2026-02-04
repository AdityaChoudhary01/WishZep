"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Chrome } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const syncUserProfile = async (user: any) => {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      displayName: user.displayName,
      profileImageUrl: user.photoURL,
      role: 'customer',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // Firestore handles merge for existing docs
    }, { merge: true });
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
      
      toast({
        title: "Success! ✨",
        description: "You've successfully signed in with Google.",
      });
      router.push('/profile');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Could not sign in with Google.",
      });
    }
  };

  const handleEmailLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    // Simulated magic link behavior for prototype
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Magic Link Sent! ✉️",
        description: `Check ${email} for your secure login link.`,
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-black">Welcome Back</h1>
          <p className="text-muted-foreground">Access your WishZep aura collective</p>
        </div>

        <form onSubmit={handleEmailLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="glass h-14 pl-12 rounded-2xl bg-white/30 border-white/20 focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20"
          >
            {isLoading ? "Sending..." : "Get Magic Link"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground font-bold">Or</span></div>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleGoogleLogin}
            variant="outline" 
            className="glass w-full h-14 rounded-2xl gap-3 font-bold hover:bg-white/50 border-white/40"
          >
            <Chrome className="w-5 h-5 text-red-500" /> Sign in with Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          By signing in, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}