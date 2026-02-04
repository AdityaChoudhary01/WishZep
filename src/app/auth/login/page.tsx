
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Chrome, UserCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
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
      email: user.email || 'guest@wishzep.com',
      displayName: user.displayName || 'Aura Guest',
      profileImageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
      role: 'customer',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), 
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

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInAnonymously(auth);
      await syncUserProfile(result.user);
      toast({
        title: "Guest Access Granted 🔓",
        description: "You're now browsing as a guest member.",
      });
      router.push('/profile');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Guest sign-in failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-black">Welcome to WishZep</h1>
          <p className="text-muted-foreground">Access your curated aura collection</p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20"
          >
            <Chrome className="w-5 h-5" /> Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground font-bold">Or</span></div>
          </div>

          <Button 
            onClick={handleGuestLogin}
            variant="outline"
            disabled={isLoading}
            className="glass w-full h-14 rounded-2xl gap-3 font-bold hover:bg-white/50 border-white/40"
          >
            <UserCheck className="w-5 h-5 text-secondary" /> {isLoading ? "Entering..." : "Continue as Guest"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
