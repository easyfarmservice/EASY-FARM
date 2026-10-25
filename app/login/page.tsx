'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, RefreshCw, ShoppingBag, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OtpInput, maskEmail } from '@/components/auth/OtpInput';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const isAdminTarget = nextParam === '/admin' || Boolean(nextParam?.startsWith('/admin'));

  // Screen flow: 'email' (customer OTP) | 'otp' (verify code) | 'admin-password' (admin password only)
  const [step, setStep] = useState<'email' | 'otp' | 'admin-password'>(
    isAdminTarget ? 'admin-password' : 'email'
  );

  // Input states
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('message') ? decodeURIComponent(searchParams.get('message') || '') : null
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend Cooldown Timer (60s default)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Check if user is already logged in
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profile?.role === 'admin') {
            if (isAdminTarget) {
              router.push('/admin');
            } else {
              router.push('/admin');
            }
          } else if (!isAdminTarget) {
            const redirectUrl = nextParam && nextParam.startsWith('/') ? nextParam : '/account';
            router.push(redirectUrl);
          }
        }
      } catch (err) {
        console.warn('Session verification fallback:', err);
      }
    }

    checkExistingSession();
  }, [router, isAdminTarget, nextParam]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SEND OTP CODE (Customer Passwordless Login via Supabase signInWithOtp)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const supabase = createClient();

      let { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        try {
          const fallbackRes = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, type: 'login' }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok && fallbackData.success) {
            otpError = null;
          }
        } catch (_) {}
      }

      if (otpError) {
        const msg = otpError.message.toLowerCase();
        if (msg.includes('signups not allowed') || msg.includes('user not found')) {
          setError(`No account found for "${cleanEmail}". Please create an account to get started.`);
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many login attempts. Please wait a few moments before requesting another code.');
        } else if (
          msg.includes('error sending') ||
          msg.includes('magic link') ||
          msg.includes('confirmation email') ||
          (otpError as any).status === 500
        ) {
          setError(
            'Supabase Mailer Error: Supabase free tier rate-limits built-in emails (3/hour). Please configure Custom SMTP in your Supabase Dashboard (Project Settings → Authentication → SMTP Settings).'
          );
        } else {
          setError(otpError.message || 'Unable to send verification code. Please try again.');
        }
        return;
      }

      setStep('otp');
      setCooldown(60);
      setSuccessNotice(`Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. VERIFY OTP CODE (Customer Supabase verifyOtp)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (cleanOtp.length < 6) {
      setError('Please enter your verification code.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      });

      if (verifyErr) {
        const msg = verifyErr.message.toLowerCase();
        if (msg.includes('expired')) {
          setError('This verification code has expired. Please click "Resend verification code" below.');
        } else if (msg.includes('invalid') || msg.includes('token')) {
          setError('Incorrect verification code. Please check your email and try again.');
        } else {
          setError(verifyErr.message || 'Verification failed. Please try again.');
        }
        setOtpCode('');
        return;
      }

      if (!data.user) {
        throw new Error('Verification completed, but no user session was returned.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      const isAdmin = profile?.role === 'admin' || cleanEmail.endsWith('@easyfarm.in');

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'easyfarm_user',
          JSON.stringify({
            id: profile?.id || data.user.id,
            email: data.user.email,
            fullName: profile?.full_name || cleanEmail.split('@')[0],
            role: isAdmin ? 'admin' : 'customer',
          })
        );
      }

      if (isAdmin && isAdminTarget) {
        router.push('/admin');
      } else if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
        router.push(nextParam);
      } else {
        router.push('/account');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. RESEND OTP CODE
  // ─────────────────────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();

      const { error: resendErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (resendErr) {
        const msg = resendErr.message.toLowerCase();
        if (
          msg.includes('error sending') ||
          msg.includes('magic link') ||
          msg.includes('confirmation email') ||
          (resendErr as any).status === 500
        ) {
          setError(
            'Supabase Mailer Error: Supabase free tier rate-limits built-in emails (3/hour). Please configure Custom SMTP in your Supabase Dashboard (Project Settings → Authentication → SMTP Settings).'
          );
        } else {
          setError(resendErr.message || 'Could not resend code. Please try again.');
        }
        return;
      }

      setCooldown(60);
      setSuccessNotice(`New verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'Could not resend verification code.');
    } finally {
      setResending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ADMIN PASSWORD LOGIN (STRICTLY PASSWORD ONLY — NO OTP GENERATED)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid administrator email.');
      return;
    }

    if (!cleanPassword) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // STRICT PASSWORD SIGN IN
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authErr) {
        const msg = authErr.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          setError('Invalid email or password. Please verify your administrator credentials.');
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many failed attempts. Please wait a few moments before trying again.');
        } else {
          setError(authErr.message || 'Admin authentication failed. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        throw new Error('Authentication succeeded, but no user session was returned.');
      }

      // Verify Admin privileges
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      const isRoleAdmin = profile?.role === 'admin';
      const isDomainAdmin = cleanEmail.endsWith('@easyfarm.in');
      const isKnownAdmin = cleanEmail === 'shivashankarlode@gmail.com' || cleanEmail === 'shivashankarlode8@gmail.com';

      let isAuthorized = isRoleAdmin || isDomainAdmin || isKnownAdmin;

      if (!isAuthorized && profile?.id) {
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle();
        if (adminRecord) isAuthorized = true;
      }

      if (!isAuthorized) {
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('easyfarm_admin_verified');
          sessionStorage.removeItem('easyfarm_admin_email');
        }
        setError('Access denied: This account is not registered with administrator privileges.');
        setLoading(false);
        return;
      }

      // Cache verified session for zero-flicker admin panel navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('easyfarm_admin_verified', 'true');
        sessionStorage.setItem('easyfarm_admin_email', data.user.email || cleanEmail);
        localStorage.setItem(
          'easyfarm_admin_user',
          JSON.stringify({
            id: profile?.id || data.user.id,
            email: data.user.email || cleanEmail,
            role: 'admin',
          })
        );
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F7F8F2]">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: EDITORIAL BRAND STORYTELLING (54% on Desktop)
      ───────────────────────────────────────────────────────────── */}
      <div 
        className="w-full lg:w-[54%] relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 text-white overflow-hidden bg-cover bg-center min-h-[260px] sm:min-h-[320px] lg:min-h-screen"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(14, 38, 27, 0.42) 0%, rgba(14, 38, 27, 0.76) 48%, rgba(10, 29, 21, 0.94) 100%), url('/images/custom-box-veggies.jpg'), url('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(168,204,98,0.18)_0%,transparent_60%)] pointer-events-none" />

        {/* Top: Brand Logo Lockup */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/easyfarm-logo.png"
              alt="Easy Farm"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-fraunces)] text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none drop-shadow-sm">
                Easy Farm
              </span>
              <span className="text-[9px] sm:text-[10px] font-sans font-bold text-[#A8CC62] tracking-[0.18em] uppercase mt-1">
                Telangana Fresh
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Editorial Narrative */}
        <div className="relative z-10 my-6 sm:my-10 lg:my-0 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-100 mb-4 sm:mb-6">
            <span className="w-2 h-2 rounded-full bg-[#A8CC62] shadow-[0_0_8px_#A8CC62]" />
            <span>Sunday Harvest Dispatch</span>
          </div>

          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.15] text-white tracking-tight mb-3 sm:mb-4">
            Good food starts closer to home.
          </h1>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal max-w-md hidden sm:block">
            Discover fresh seasonal produce sourced from Telangana farms and delivered with care.
          </p>
        </div>

        {/* Bottom: Signature & Trust Attributes */}
        <div className="relative z-10 hidden lg:flex items-center justify-between pt-6 border-t border-white/20">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#A8CC62]">
            FRESH FROM TELANGANA
          </span>
          <div className="flex items-center gap-4 text-xs text-white/80">
            <span className="flex items-center gap-1.5">
              <span className="text-[#A8CC62]">✓</span> 100% Pesticide-Free
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#A8CC62]">✓</span> Zero Middlemen
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: AUTHENTICATION (46% on Desktop, Warm Ivory)
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[46%] bg-[#F7F8F2] flex items-center justify-center p-6 sm:p-10 lg:p-14 relative rounded-t-[28px] -mt-6 lg:mt-0 lg:rounded-none z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.06)] lg:shadow-none">
        <div className="w-full max-w-[410px] mx-auto">
          {/* Mobile Sheet Handle Indicator */}
          <div className="w-10 h-1 bg-[#D4DBCF] rounded-full mx-auto mb-6 lg:hidden" />

          {/* ──────────────── STEP: ADMIN PASSWORD LOGIN ──────────────── */}
          {step === 'admin-password' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#1D6845] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ADMINISTRATOR OPERATIONS
                </span>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-[34px] font-semibold text-[#0B291D] tracking-tight leading-tight">
                  Operations Login
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6B62]">
                  Sign in with your email and password to access the Easy Farm operations panel.
                </p>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Password Form */}
              <form onSubmit={handleAdminPasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#17231C]">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6B62]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="admin@easyfarm.in"
                      className="w-full h-[52px] pl-10 pr-4 rounded-xl border border-[#D5DCD0] bg-white text-[#17231C] placeholder-[#9CA9A0] text-base focus:outline-none focus:border-[#1D6845] focus:ring-2 focus:ring-[#1D6845]/20 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#17231C]">
                    Admin Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6B62]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••••••"
                      className="w-full h-[52px] pl-10 pr-11 rounded-xl border border-[#D5DCD0] bg-white text-[#17231C] placeholder-[#9CA9A0] text-base focus:outline-none focus:border-[#1D6845] focus:ring-2 focus:ring-[#1D6845]/20 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5B6B62] hover:text-[#17231C] transition cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] mt-2 rounded-xl bg-[#123D2B] hover:bg-[#0B291D] disabled:opacity-50 text-white font-semibold text-sm sm:text-[15px] transition shadow-[0_4px_14px_rgba(18,61,43,0.25)] hover:shadow-[0_6px_20px_rgba(18,61,43,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Admin...</span>
                    </>
                  ) : (
                    <span>Sign In to Operations Panel</span>
                  )}
                </button>
              </form>

              {/* Return to Customer Login */}
              <div className="pt-4 border-t border-[#E1E6DC] text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="text-xs font-semibold text-[#1D6845] hover:text-[#123D2B] underline cursor-pointer"
                >
                  ← Return to Customer Sign In
                </button>
              </div>
            </div>
          ) : step === 'otp' ? (
            /* ──────────────── STEP 2: OTP VERIFICATION ──────────────── */
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#1D6845]">
                  STEP 2 OF 2
                </span>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-[34px] font-semibold text-[#0B291D] tracking-tight leading-tight">
                  Check your inbox.
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6B62] leading-relaxed">
                  We sent a 6-digit verification code to{' '}
                  <strong className="text-[#17231C] font-semibold">{maskEmail(email)}</strong>.
                </p>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {successNotice && !error && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {/* 6-Digit Code Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#17231C] text-center mb-1.5">
                    Enter 6-Digit Code
                  </label>
                  <OtpInput
                    length={6}
                    value={otpCode}
                    onChange={(val) => {
                      setOtpCode(val);
                      if (error) setError(null);
                    }}
                    hasError={Boolean(error)}
                    disabled={verifying}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || otpCode.length < 6}
                  className="w-full h-[52px] rounded-xl bg-[#123D2B] hover:bg-[#0B291D] disabled:opacity-50 text-white font-semibold text-sm sm:text-[15px] transition shadow-[0_4px_14px_rgba(18,61,43,0.25)] hover:shadow-[0_6px_20px_rgba(18,61,43,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Verify and Sign In</span>
                  )}
                </button>
              </form>

              {/* Resend & Back Actions */}
              <div className="space-y-3 pt-2 text-center text-xs">
                <div className="text-[#5B6B62]">
                  Didn't receive the email?{' '}
                  {cooldown > 0 ? (
                    <span className="text-slate-400 font-semibold">
                      Resend in <strong className="text-[#17231C]">{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="font-bold text-[#1D6845] hover:text-[#123D2B] underline cursor-pointer"
                    >
                      {resending ? 'Sending...' : 'Resend verification code'}
                    </button>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setOtpCode('');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[#6D7D73] hover:text-[#17231C] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Use a different email address</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ──────────────── STEP 1: CUSTOMER EMAIL SIGN IN ──────────────── */
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#1D6845]">
                  WELCOME BACK
                </span>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-[34px] font-semibold text-[#0B291D] tracking-tight leading-tight">
                  Welcome back.
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6B62]">
                  Sign in to continue your Easy Farm journey.
                </p>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#17231C]">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6B62]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full h-[52px] pl-10 pr-4 rounded-xl border border-[#D5DCD0] bg-white text-[#17231C] placeholder-[#9CA9A0] text-base focus:outline-none focus:border-[#1D6845] focus:ring-2 focus:ring-[#1D6845]/20 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] mt-2 rounded-xl bg-[#123D2B] hover:bg-[#0B291D] disabled:opacity-50 text-white font-semibold text-sm sm:text-[15px] transition shadow-[0_4px_14px_rgba(18,61,43,0.25)] hover:shadow-[0_6px_20px_rgba(18,61,43,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <span>Send verification code</span>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5B6B62] text-center pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#1D6845]" />
                  <span>Secure sign-in with email verification.</span>
                </div>
              </form>

              {/* Footer Links */}
              <div className="pt-6 border-t border-[#E1E6DC] text-center space-y-3.5 text-xs">
                <p className="text-[#5B6B62]">
                  New to Easy Farm?{' '}
                  <Link
                    href={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : '/signup'}
                    className="font-bold text-[#123D2B] hover:text-[#0B291D] underline"
                  >
                    Create an account
                  </Link>
                </p>

                <div>
                  <Link
                    href="/baskets"
                    className="inline-flex items-center gap-1.5 text-[#6D7D73] hover:text-[#123D2B] transition font-medium"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Return to shopping</span>
                  </Link>
                </div>

                <div className="pt-2 text-[11px] text-[#85948B]">
                  Easy Farm Operations Team?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('admin-password');
                      setError(null);
                    }}
                    className="font-semibold text-[#1D6845] hover:underline cursor-pointer"
                  >
                    Admin Sign In
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8F2] flex items-center justify-center text-xs text-[#5B6B62]">Loading sign in...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
