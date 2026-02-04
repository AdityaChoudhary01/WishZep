
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Chrome, UserCheck, Send } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, sendSignInLinkToEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);
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

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (e.g. stackblitz.io)
      // must be in the authorized domains list in the Firebase Console.
      url: window.location.origin + '/auth/login',
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save the email locally so you don't have to type it again on the landing page
      window.localStorage.setItem('emailForSignIn', email);
      setIsLinkSent(true);
      toast({
        title: "Link Sent! 📧",
        description: "Check your inbox for the magic sign-in link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send link",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
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

        <div className="space-y-6">
          {!isLinkSent ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="h-14 pl-12 rounded-2xl glass bg-white/30 border-white/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20"
              >
                <Send className="w-5 h-5" /> {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          ) : (
            <div className="p-6 bg-primary/10 rounded-2xl text-center space-y-4 animate-in fade-in zoom-in">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold">Link sent to your email!</p>
                <p className="text-sm text-muted-foreground">Please click the link in your inbox to sign in.</p>
              </div>
              <Button variant="ghost" className="text-primary font-bold" onClick={() => setIsLinkSent(false)}>
                Try another email
              </Button>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground font-bold">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleGoogleLogin}
              variant="outline"
              className="glass h-14 rounded-2xl gap-3 font-bold hover:bg-white/50 border-white/40"
            >
              <Chrome className="w-5 h-5 text-primary" /> Google
            </Button>
            <Button 
              onClick={handleGuestLogin}
              variant="outline"
              disabled={isLoading}
              className="glass h-14 rounded-2xl gap-3 font-bold hover:bg-white/50 border-white/40"
            >
              <UserCheck className="w-5 h-5 text-secondary" /> Guest
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
