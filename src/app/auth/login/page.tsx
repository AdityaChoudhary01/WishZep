
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2, ShieldCheck, Zap, AlertCircle, Sparkles } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Ensure the popup isn't blocked by client-side extensions
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
      
      toast({
        title: "Success! ✨",
        description: "You've successfully signed in with Google.",
      });
      router.push('/profile');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("The sign-in window was closed before completion. This often happens if the domain is not authorized in your Firebase Console (Auth > Settings > Authorized Domains).");
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError(`Domain Not Authorized: Add "${window.location.hostname}" to 'Authorized Domains' in your Firebase Console.`);
      } else if (error.message?.includes('blocked-by-client')) {
        setAuthError("Sign-in blocked by browser. Please check for AdBlockers or strict privacy settings.");
      } else {
        setAuthError(error.message || "An unexpected error occurred during sign-in.");
      }

      toast({
        variant: "destructive",
        title: "Sign-in Interrupted",
        description: "Review the notice below for troubleshooting steps.",
      });
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setAuthError(null);
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
      console.error('Magic Link Error:', error);
      setAuthError(error.message);
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
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 blur-[60px] -ml-16 -mb-16" />
        
        <div className="text-center space-y-3 relative z-10">
          <div className="w-16 h-16 rounded-[1.25rem] bg-primary flex items-center justify-center mx-auto mb-6 rotate-6 shadow-xl shadow-primary/20 transition-transform hover:rotate-0">
            <span className="text-white font-black text-3xl">W</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Welcome Back</h1>
          <p className="text-muted-foreground font-medium">Access your curated WishZep artifacts</p>
        </div>

        {authError && (
          <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest mb-1">Sign-in Notice</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed opacity-90">
              {authError}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 relative z-10">
          {!isLinkSent ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/30 transition-all text-sm font-bold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 
                {isLoading ? "Sending Signal..." : "Send Magic Link"}
              </button>
            </form>
          ) : (
            <div className="p-8 bg-primary/5 rounded-[2rem] text-center space-y-6 animate-in fade-in zoom-in border border-primary/10">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
                <Send className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black">Link Transmitted!</p>
                <p className="text-sm text-muted-foreground">Check your inbox to finalize the authentication bridge.</p>
              </div>
              <Button variant="ghost" className="text-primary font-black uppercase tracking-widest text-xs hover:bg-primary/10 rounded-xl" onClick={() => setIsLinkSent(false)}>
                Use Another Frequency
              </Button>
            </div>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
              <span className="bg-white px-4">Direct Sync</span>
            </div>
          </div>

          <Button 
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 font-bold hover:bg-gray-50 border-gray-100 transition-all active:scale-95 shadow-sm group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                fill="#FBBC05"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4 text-[9px] text-gray-400 font-black uppercase tracking-widest relative z-10">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Encrypted</span>
          <span className="w-1 h-1 bg-gray-200 rounded-full" />
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Premium Access</span>
        </div>

        <p className="text-center text-[10px] text-gray-400 leading-relaxed max-w-[250px] mx-auto font-medium">
          By engaging, you align with our <span className="underline cursor-pointer hover:text-primary">Protocols</span> and <span className="underline cursor-pointer hover:text-primary">Data Ethics</span>.
        </p>
      </div>
    </div>
  );
}
