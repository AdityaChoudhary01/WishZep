
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Chrome, Send, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const syncUserProfile = async (user: any) => {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    
    const profileData: any = {
      id: user.uid,
      email: user.email,
      profileImageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
      role: 'customer',
      updatedAt: serverTimestamp(),
    };

    if (user.displayName) {
      profileData.displayName = user.displayName;
    }

    await setDoc(userRef, profileData, { merge: true });
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }

      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await syncUserProfile(result.user);
            toast({
              title: "Welcome Back! ✨",
              description: "Successfully signed in with your magic link.",
            });
            router.push('/profile');
          })
          .catch((error) => {
            console.error(error);
            toast({
              variant: "destructive",
              title: "Sign in failed",
              description: "The link may have expired or was already used.",
            });
          })
          .finally(() => {
            setIsCompletingSignIn(false);
          });
      }
    }
  }, [auth, router, toast]);

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
      url: window.location.origin + '/auth/login',
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setIsLinkSent(true);
      toast({
        title: "Link Sent! 📧",
        description: "Check your inbox for the WishZep magic sign-in link.",
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

  if (isCompletingSignIn) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
        <div className="text-center space-y-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-2xl font-black">Validating your <span className="wishzep-text">Aura...</span></h2>
          <p className="text-muted-foreground">Completing your secure sign-in, please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] -mr-16 -mt-16" />
        
        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl transition-transform hover:rotate-0">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-3xl font-black">Welcome to WishZep</h1>
          <p className="text-muted-foreground">Access your curated WishZep collection</p>
        </div>

        <div className="space-y-6 relative z-10">
          {!isLinkSent ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="h-14 pl-12 rounded-2xl glass bg-white/30 border-white/20 focus:bg-white/50 transition-all text-lg font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white text-lg font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 
                {isLoading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          ) : (
            <div className="p-8 glass bg-primary/5 rounded-[2rem] text-center space-y-6 animate-in fade-in zoom-in border-primary/20">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
                <Send className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xl font-black">Link sent to your inbox!</p>
                <p className="text-sm text-muted-foreground mt-2">Check your email to finalize the frequency sync.</p>
              </div>
              <Button variant="ghost" className="text-primary font-bold hover:bg-primary/10 rounded-xl" onClick={() => setIsLinkSent(false)}>
                Try another email
              </Button>
            </div>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="glass bg-white/40 px-4 text-muted-foreground font-bold rounded-full border border-white/20">Frequency Bridge</span></div>
          </div>

          <Button 
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full glass h-14 rounded-2xl gap-3 font-bold hover:bg-white/50 border-white/40 transition-all active:scale-95 shadow-lg shadow-black/5"
          >
            <Chrome className="w-5 h-5 text-primary" /> Continue with Google
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest relative z-10">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure</span>
          <span className="w-1 h-1 bg-muted-foreground rounded-full" />
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed max-w-[200px] mx-auto">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
