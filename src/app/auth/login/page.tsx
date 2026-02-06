"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Added for animations
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, Loader2, ShieldCheck, Zap, AlertCircle, Sparkles, Fingerprint, Phone, CheckCircle2, ChevronLeft } from 'lucide-react';
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

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  const syncUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const profileData: any = {
      id: user.uid,
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      profileImageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
      role: 'customer',
      updatedAt: serverTimestamp(),
    };
    if (user.displayName) profileData.displayName = user.displayName;
    await setDoc(userRef, profileData, { merge: true });
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) emailForSignIn = window.prompt('Please confirm your email address:');
      if (emailForSignIn) {
        setIsCompletingSignIn(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await syncUserProfile(result.user);
            toast({ title: "Welcome back!", description: "You have signed in successfully." });
            router.push('/profile');
          })
          .catch(() => {
            toast({ variant: "destructive", title: "Sign in failed", description: "The link might have expired." });
          })
          .finally(() => setIsCompletingSignIn(false));
      }
    }
  }, [auth, router, toast]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user);
      toast({ title: "Success", description: "Signed in with Google." });
      router.push('/profile');
    } catch (error: any) {
      setAuthError(error.code === 'auth/popup-closed-by-user' ? "Sign-in was cancelled." : error.message);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, { url: window.location.origin + '/auth/login', handleCodeInApp: true });
      window.localStorage.setItem('emailForSignIn', email);
      setIsLinkSent(true);
      toast({ title: "Email Sent", description: "Please check your inbox." });
    } catch (error: any) {
      setAuthError(error.message);
    } finally { setIsLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsLoading(true);
    try {
      setupRecaptcha();
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: "Code Sent", description: "Check your phone." });
    } catch (error: any) {
      setAuthError(error.message);
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) return;
    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      await syncUserProfile(result.user);
      router.push('/profile');
    } catch { setAuthError("Incorrect code. Please try again."); }
    finally { setIsLoading(false); }
  };

  if (isCompletingSignIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Verifying your account...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 flex items-center justify-center min-h-screen relative overflow-hidden bg-[#fafafa]">
      {/* Dynamic Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} 
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[460px] bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-gray-100 relative z-10"
      >
        <div id="recaptcha-container"></div>
        
        <div className="text-center space-y-2 mb-8 flex flex-col items-center">
          <BrandLogo size="lg" className="hover:rotate-3 transition-transform duration-300" />
          <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest mt-4">Secure Gateway</p>
        </div>

        <AnimatePresence mode="wait">
          {authError && (
            <motion.div key="error" {...fadeInUp}>
              <Alert variant="destructive" className="mb-6 rounded-2xl bg-red-50/50 border-red-100 text-red-600 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-bold">{authError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-14 rounded-2xl gap-3 font-bold bg-white hover:bg-gray-50 border-gray-200 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </motion.div>

          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-[0.2em] font-black text-gray-300">or choice</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <AnimatePresence mode="wait">
            {!isLinkSent ? (
              <motion.form key="email-form" {...fadeInUp} onSubmit={handleMagicLinkLogin} className="space-y-3">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="name@email.com" 
                    className="h-14 pl-12 rounded-2xl bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary/5 focus:border-primary/30 font-bold transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isOtpSent}
                  />
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    type="submit"
                    disabled={isLoading || isOtpSent}
                    className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold transition-all shadow-xl shadow-slate-200"
                  >
                    {isLoading && !isOtpSent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} 
                    {isLoading && !isOtpSent ? "Generating..." : "Magic Link"}
                  </Button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.div key="email-sent" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-8 bg-primary/5 rounded-[2rem] text-center space-y-4 border border-primary/10">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto text-white shadow-xl rotate-3">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800">Check your Inbox</p>
                  <p className="text-sm text-gray-500">We've sent a magic link to your mail.</p>
                </div>
                <Button variant="link" className="text-primary text-xs font-bold h-auto p-0" onClick={() => setIsLinkSent(false)}>
                  Wrong email? Try again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative py-2 flex items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-[0.2em] font-black text-gray-300">Fast access</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {!isOtpSent ? (
            <motion.form {...fadeInUp} onSubmit={handleSendOtp} className="space-y-3">
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  type="tel" 
                  placeholder="Mobile number" 
                  maxLength={10}
                  className="h-14 pl-12 rounded-2xl bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary/5 font-bold transition-all"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button 
                  type="submit"
                  disabled={isLoading || !phoneNumber || phoneNumber.length < 10}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-lg shadow-primary/20"
                >
                  {isLoading && isOtpSent === false ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 
                  Send OTP
                </Button>
              </motion.div>
            </motion.form>
          ) : (
            <motion.form key="otp-verify" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification Code</p>
                  <button type="button" onClick={() => setIsOtpSent(false)} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                    <ChevronLeft className="w-3 h-3" /> Edit Number
                  </button>
                </div>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                  <Input 
                    type="text" 
                    placeholder="0 0 0 0 0 0" 
                    maxLength={6}
                    className="h-16 pl-12 rounded-2xl bg-white border-2 border-primary/10 focus:border-primary text-center text-2xl font-black tracking-[0.5em] shadow-inner"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isLoading || verificationCode.length < 6}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 bg-black hover:bg-slate-800 text-white font-bold transition-all"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
                Verify & Login
              </Button>
            </motion.form>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 pt-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.5 }} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> End-to-end Encrypted
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.7 }} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> WishZep Secure
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
