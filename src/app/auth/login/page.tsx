"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowRight, Loader2, ShieldCheck, Smartphone, AlertCircle, Sparkles, UserCheck, Lock } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import BrandLogo from '@/components/BrandLogo';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // State
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  
  // Email State
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  // RECAPTCHA REF (Prevents double rendering/vibration)
  const recaptchaInitialized = useRef(false);

  // --- 1. INITIALIZE RECAPTCHA (STRICT SINGLE RUN) ---
  useEffect(() => {
    if (!auth || recaptchaInitialized.current) return;

    // Ensure DOM element exists
    const container = document.getElementById('recaptcha-container');
    if (container) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // ReCAPTCHA solved automatically
          },
          'expired-callback': () => {
            // Reset if expired
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              recaptchaInitialized.current = false; 
            }
          }
        });
        recaptchaInitialized.current = true;
      } catch (error) {
        // Silent fail to prevent console spam
      }
    }
  }, [auth]);

  // --- 2. USER SYNC ---
  const syncUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const profileData: any = {
      id: user.uid,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      profileImageUrl: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`,
      role: 'customer',
      updatedAt: serverTimestamp(),
    };

    if (user.displayName) profileData.displayName = user.displayName;

    await setDoc(userRef, profileData, { merge: true });
  };

  // --- 3. CHECK FOR EMAIL LINK ON LOAD ---
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please confirm your email for security:');
      }

      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await syncUserProfile(result.user);
            toast({ title: "Welcome!", description: "You are now logged in." });
            router.push('/profile');
          })
          .catch(() => {
            toast({ variant: "destructive", title: "Link Expired", description: "Please request a new login link." });
          })
          .finally(() => {
            setIsCompletingSignIn(false);
          });
      }
    }
  }, [auth, router, toast]);

  // --- HANDLERS ---

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setAuthError(null);
      await syncUserProfile(result.user);
      toast({ title: "Success", description: "Logged in with Google." });
      router.push('/profile');
    } catch (error: any) {
      // User closed popup or network error
      setAuthError("Login cancelled or failed. Please try again.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
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
      toast({ title: "Check your Email", description: "We sent you a secure login link." });
    } catch (error: any) {
      setAuthError("Could not send email. Please check the address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!window.recaptchaVerifier) {
        // Fallback re-init if reference lost
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: "OTP Sent", description: "Please check your SMS." });
    } catch (error: any) {
      setAuthError("Could not send OTP. Refresh page and try again.");
      // Reset captcha
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); recaptchaInitialized.current = false; } catch(e) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      await syncUserProfile(result.user);
      toast({ title: "Verified", description: "Login successful." });
      router.push('/profile');
    } catch {
      setAuthError("Incorrect OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Secure Login...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white relative overflow-hidden px-4">
      {/* Background Decor (Ultramodern Glows) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-60" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] opacity-60" />

      <div className="w-full max-w-[440px] relative z-10">
        
        {/* RECAPTCHA CONTAINER (Hidden but functional) */}
        <div id="recaptcha-container"></div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block mb-6 hover:scale-105 transition-transform duration-300">
              <BrandLogo size="lg" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-sm font-medium text-gray-500">Secure access to your account</p>
          </div>

          {/* Error Alert */}
          {authError && (
            <Alert variant="destructive" className="mb-6 rounded-2xl border-red-100 bg-red-50 text-red-600 animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-bold">{authError}</AlertDescription>
            </Alert>
          )}

          {/* Google Button */}
          <Button 
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-16 rounded-2xl bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-base transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-3 mb-8"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-gray-300">
              <span className="bg-white px-4">Or Login With</span>
            </div>
          </div>

          {/* Toggle Phone/Email */}
          <div className="flex p-1 bg-gray-50 rounded-2xl mb-6 border border-gray-100">
            <button 
              onClick={() => { setLoginMethod('phone'); setIsLinkSent(false); setAuthError(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${loginMethod === 'phone' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Phone Number
            </button>
            <button 
              onClick={() => { setLoginMethod('email'); setIsOtpSent(false); setAuthError(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${loginMethod === 'email' ? 'bg-white shadow-md text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Email Address
            </button>
          </div>

          {/* PHONE LOGIN FORM */}
          {loginMethod === 'phone' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative group">
                    <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="tel" 
                      placeholder="Mobile Number" 
                      className="h-16 pl-14 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 font-bold text-lg transition-all"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || phoneNumber.length < 10}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-lg shadow-xl shadow-gray-200 hover:shadow-gray-300 transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-gray-500">Enter code sent to +91 {phoneNumber}</p>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <Input 
                      type="text" 
                      placeholder="• • • • • •" 
                      maxLength={6}
                      className="h-16 pl-14 rounded-2xl bg-white border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20 text-center text-2xl font-black tracking-[0.5em] transition-all"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || otp.length < 6}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Login"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    type="button"
                    className="w-full text-xs font-bold text-gray-400 hover:text-gray-900"
                    onClick={() => setIsOtpSent(false)}
                  >
                    Change Number
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* EMAIL LOGIN FORM */}
          {loginMethod === 'email' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
              {!isLinkSent ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <Input 
                      type="email" 
                      placeholder="Email Address" 
                      className="h-16 pl-14 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 font-bold text-lg transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !email}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-lg shadow-xl shadow-gray-200 hover:shadow-gray-300 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="flex items-center gap-2">Send Login Link <ArrowRight className="w-5 h-5"/></span>}
                  </Button>
                </form>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Link Sent!</h3>
                  <p className="text-sm text-gray-600 font-medium mb-6">Check your inbox for the secure login link.</p>
                  <Button 
                    variant="outline" 
                    className="rounded-xl font-bold border-2"
                    onClick={() => setIsLinkSent(false)}
                  >
                    Try different email
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Badges */}
        <div className="mt-8 flex justify-center items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>SSL Encrypted</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Verified</span>
          </div>
        </div>

      </div>
    </div>
  );
}
