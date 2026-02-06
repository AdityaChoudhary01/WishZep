
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2, ShieldCheck, Zap, AlertCircle, Sparkles, Fingerprint, Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WishZepLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="url(#login_logo_gradient)" />
    <path d="M25 30L40 70L50 45L60 70L75 30" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="login_logo_gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#BE29EC" />
        <stop offset="1" stopColor="#29A6EC" />
      </linearGradient>
    </defs>
  </svg>
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const syncUserProfile = async (user: any) => {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    
    const profileData: any = {
      id: user.uid,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
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
        emailForSignIn = window.prompt('Please confirm your email address:');
      }

      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await syncUserProfile(result.user);
            toast({
              title: "Welcome back!",
              description: "You have signed in successfully.",
            });
            router.push('/profile');
          })
          .catch(() => {
            toast({
              variant: "destructive",
              title: "Sign in failed",
              description: "The link might have expired. Please try again.",
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
      setAuthError(null);
      await syncUserProfile(result.user);
      toast({
        title: "Success",
        description: "Signed in with Google.",
      });
      router.push('/profile');
    } catch (error: any) {
      setAuthError(error.code === 'auth/popup-closed-by-user' ? "Sign-in was cancelled." : error.message);
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
      toast({ title: "Email Sent", description: "Please check your inbox for the sign-in link." });
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible'
    });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: "Code Sent", description: "Check your phone for the verification code." });
    } catch (error: any) {
      setAuthError(error.message);
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        delete (window as any).recaptchaVerifier;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      await syncUserProfile(result.user);
      toast({ title: "Success", description: "Phone verification successful." });
      router.push('/profile');
    } catch {
      setAuthError("Incorrect code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Verifying your account...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[85vh] px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[450px] bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100 relative z-10 animate-fade-in">
        <div id="recaptcha-container"></div>
        
        <div className="text-center space-y-2 mb-10">
          <WishZepLogo className="w-16 h-16 mx-auto mb-6 shadow-xl shadow-primary/20 rotate-3" />
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 font-medium text-sm">Sign in to your account</p>
        </div>

        {authError && (
          <Alert variant="destructive" className="mb-6 rounded-2xl bg-red-50 border-red-100 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-bold">
              {authError}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Button 
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-14 rounded-2xl gap-3 font-bold bg-white hover:bg-gray-50 border-gray-200 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest font-black text-gray-300">or use email</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {!isLinkSent ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/30 font-bold transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isOtpSent}
                />
              </div>
              <Button 
                type="submit"
                disabled={isLoading || isOtpSent}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold transition-all shadow-lg shadow-gray-200 active:scale-95"
              >
                {isLoading && !isOtpSent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} 
                {isLoading && !isOtpSent ? "Sending..." : "Email me a link"}
              </Button>
            </form>
          ) : (
            <div className="p-6 bg-primary/5 rounded-3xl text-center space-y-4 border border-primary/10 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">Check your email</p>
                <p className="text-sm text-gray-500">We've sent you a sign-in link.</p>
              </div>
              <Button variant="ghost" className="text-primary text-xs font-bold" onClick={() => setIsLinkSent(false)}>
                Try another way
              </Button>
            </div>
          )}

          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest font-black text-gray-300">or use phone</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  type="tel" 
                  placeholder="10-digit mobile number" 
                  maxLength={10}
                  className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/30 font-bold transition-all"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button 
                type="submit"
                disabled={isLoading || !phoneNumber || phoneNumber.length < 10}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                {isLoading && isOtpSent === false ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 
                Send verification code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <p className="text-xs font-bold text-center text-gray-400 uppercase tracking-widest">Verify your phone</p>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    maxLength={6}
                    className="h-14 pl-12 rounded-2xl bg-white border-primary/20 focus:border-primary text-center text-lg font-black tracking-[0.4em]"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  type="submit"
                  disabled={isLoading || verificationCode.length < 6}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-black text-white font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
                  Sign In
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-gray-500 hover:text-primary font-bold"
                  onClick={() => setIsOtpSent(false)}
                >
                  Back to phone entry
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-8 opacity-60">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-primary" /> Secure Sign-in
          </div>
          <div className="w-1 h-1 bg-gray-200 rounded-full" />
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-secondary" /> WishZep Verified
          </div>
        </div>
      </div>
    </div>
  );
}
