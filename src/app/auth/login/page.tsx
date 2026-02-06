"use client";

import { useState, useEffect, useRef } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
   
  const [email, setEmail] = useState('');
  const [isLinkSent, setIsLinkSent] = useState(false);
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
   
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const recaptchaInitialized = useRef(false);

  // --- RECAPTCHA LOGIC (Unchanged) ---
  useEffect(() => {
    if (!auth || recaptchaInitialized.current) return;
    try {
      const container = document.getElementById('recaptcha-container');
      if (container) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {},
          'expired-callback': () => {
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.render().then(widgetId => window.recaptchaVerifier.reset(widgetId));
            }
          }
        });
        recaptchaInitialized.current = true;
      }
    } catch (error) {}
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); recaptchaInitialized.current = false; } catch (e) {}
      }
    };
  }, [auth]);

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
            toast({ title: "Welcome!", description: "Login successful." });
            router.push('/profile');
          })
          .catch(() => toast({ variant: "destructive", title: "Link Expired", description: "Please try logging in again." }))
          .finally(() => setIsCompletingSignIn(false));
      }
    }
  }, [auth, router, toast]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setAuthError(null);
      await syncUserProfile(result.user);
      toast({ title: "Success", description: "Logged in with Google." });
      router.push('/profile');
    } catch (error: any) {
      setAuthError("Login cancelled or failed.");
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setAuthError(null);
    const actionCodeSettings = { url: window.location.origin + '/auth/login', handleCodeInApp: true };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setIsLinkSent(true);
      toast({ title: "Link Sent", description: "Check your email inbox." });
    } catch (error: any) {
      setAuthError("Could not send email. Please try again.");
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
      if (!window.recaptchaVerifier) throw new Error("Security check failed. Refresh page.");
      const appVerifier = window.recaptchaVerifier;
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      toast({ title: "OTP Sent", description: "Please check your mobile messages." });
    } catch (error: any) {
      setAuthError("Could not send OTP. Try again later.");
      if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear(); recaptchaInitialized.current = false; } catch(e) {} }
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
      toast({ title: "Success", description: "Phone verified successfully." });
      router.push('/profile');
    } catch {
      setAuthError("Wrong OTP. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompletingSignIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto relative z-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Authenticating...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden selection:bg-primary/30 text-white">
      
      {/* --- ULTRAMODERN BACKGROUND --- */}
      <div className="absolute inset-0 w-full h-full">
        {/* Gradient Mesh */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-[420px] relative z-10 p-4">
        <div id="recaptcha-container"></div>

        {/* --- GLASS CARD --- */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden relative group">
          
          {/* Top Highlight Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

          {/* Logo Section */}
          <div className="text-center space-y-6 mb-8">
            <div className="inline-block p-4 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/5 shadow-lg relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-3xl"></div>
              <BrandLogo size="lg" className="relative z-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-white">Welcome Back</h1>
              <p className="text-sm text-gray-400 font-medium">Access your dashboard securely</p>
            </div>
          </div>

          {authError && (
            <Alert variant="destructive" className="mb-6 rounded-2xl bg-red-500/10 border-red-500/20 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-bold">{authError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-5">
            {/* Google Button */}
            <Button 
              onClick={handleGoogleLogin}
              className="w-full h-14 rounded-2xl gap-3 font-bold bg-white text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>

            {/* Divider */}
            <div className="relative py-2 flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest font-black text-gray-500">Or continue with</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            {!isOtpSent ? (
              // PHONE INPUT STATE
              <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1">
                  <div className="relative group/input">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-primary transition-colors" />
                    <Input 
                      type="tel" 
                      placeholder="Mobile Number" 
                      maxLength={10}
                      className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-primary/50 font-medium transition-all"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <Button 
                  type="submit"
                  disabled={isLoading || !phoneNumber || phoneNumber.length < 10}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2">Get OTP <ArrowRight className="w-4 h-4" /></span>}
                </Button>
              </form>
            ) : (
              // OTP VERIFICATION STATE
              <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verify It's You</p>
                </div>
                
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="000000" 
                    maxLength={6}
                    className="h-16 text-center text-3xl font-black tracking-[0.5em] rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-primary/50 transition-all"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <Button 
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="w-full h-14 rounded-2xl bg-white text-black font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Login"}
                  </Button>
                  <button 
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="w-full text-xs font-bold text-gray-500 hover:text-white transition-colors py-2"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}

            {/* Email Magic Link Toggle */}
            <div className="pt-2 text-center">
               {!isLinkSent ? (
                 !isOtpSent && (
                   <button 
                     onClick={() => {
                        // Toggle logic if you want to switch between phone/email views
                        // For this layout, I'm keeping phone as primary for the "modern" feel, 
                        // but you can add the email form toggle here easily.
                        const newEmailState = prompt("Enter email for magic link:");
                        if(newEmailState) { setEmail(newEmailState); handleMagicLinkLogin({preventDefault:()=>{}} as any); }
                     }}
                     className="text-xs font-bold text-gray-500 hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                   >
                     <Mail className="w-3 h-3" /> Prefer email login?
                   </button>
                 )
               ) : (
                 <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-400 font-bold">Magic link sent to inbox!</p>
                 </div>
               )}
            </div>

          </div>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-center gap-6 pt-8 opacity-40">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Encrypted
          </div>
        </div>

      </div>
    </div>
  );
}
