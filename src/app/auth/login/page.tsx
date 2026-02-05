
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2, ShieldCheck, Zap, AlertCircle, Sparkles, Fingerprint } from 'lucide-react';
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
    try {
      const provider = new GoogleAuthProvider();
      // Directly call signInWithPopup without state changes beforehand to avoid re-renders
      const result = await signInWithPopup(auth, provider);
      
      setAuthError(null);
      await syncUserProfile(result.user);
      
      toast({
        title: "Success! ✨",
        description: "You've successfully signed in with Google.",
      });
      router.push('/profile');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      
      let errorMessage = "An unexpected error occurred.";
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = `Sign-in Interrupted: This domain ("${window.location.hostname}") must be added to 'Authorized Domains' in your Firebase Console (Auth > Settings). Ensure your browser is not blocking popups.`;
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = `Domain Not Authorized: Add "${window.location.hostname}" to 'Authorized Domains' in Firebase.`;
      } else if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        errorMessage = "Sign-in was blocked by a browser extension (like an AdBlocker). Please disable extensions for this site.";
      } else {
        errorMessage = error.message;
      }

      setAuthError(errorMessage);
      toast({
        variant: "destructive",
        title: "Sign-in Notice",
        description: "Check the diagnostic log below.",
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
        description: "Check your inbox for the magic sign-in link.",
      });
    } catch (error: any) {
      console.error('Magic Link Error:', error);
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
        <div className="text-center space-y-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-2xl font-black italic">Validating Signal...</h2>
          <p className="text-muted-foreground">Syncing your artifacts with our global registry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6 py-12 relative">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 blur-[120px] rounded-full animate-pulse delay-700" />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-3xl rounded-[3.5rem] p-10 space-y-8 shadow-[0_32px_80px_rgba(0,0,0,0.1)] border border-white/50 relative overflow-hidden animate-fade-in">
        <div className="text-center space-y-3 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 rotate-6 shadow-2xl shadow-primary/30 transition-transform hover:rotate-0 cursor-pointer">
            <span className="text-white font-black text-4xl">W</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Enter the Vault</h1>
          <p className="text-muted-foreground font-medium text-sm">Access your curated artifacts</p>
        </div>

        {authError && (
          <Alert variant="destructive" className="rounded-2xl bg-destructive/5 border-destructive/20 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest mb-1">Diagnostic Log</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed opacity-90">
              {authError}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 relative z-10">
          <Button 
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-16 rounded-2xl gap-4 font-bold bg-white hover:bg-gray-50 border-gray-100 shadow-sm active:scale-95 transition-all group"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
              <span className="bg-white/70 px-4">Secure Bridge</span>
            </div>
          </div>

          {!isLinkSent ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="h-16 pl-12 rounded-2xl bg-white border-gray-100 focus:border-primary/30 text-sm font-bold shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 bg-black hover:bg-black/90 text-white text-sm font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} 
                {isLoading ? "Transmitting..." : "Send Magic Link"}
              </button>
            </form>
          ) : (
            <div className="p-10 bg-primary/5 rounded-[3rem] text-center space-y-6 animate-in zoom-in border border-primary/10">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/20">
                <Send className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-black">Link Sent</p>
                <p className="text-sm text-muted-foreground font-medium">Check your inbox for the magic signal.</p>
              </div>
              <Button variant="ghost" className="text-primary font-black uppercase tracking-widest text-[10px]" onClick={() => setIsLinkSent(false)}>
                Try another frequency
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 text-[9px] text-gray-400 font-black uppercase tracking-widest opacity-80">
          <span className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> SSL Encrypted</span>
          <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-secondary" /> Verified Drops</span>
        </div>
      </div>
    </div>
  );
}
