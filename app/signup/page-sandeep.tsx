'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, User, Phone, ArrowLeft, AlertCircle, CheckCircle, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OtpInput, maskEmail } from '@/components/auth/OtpInput';

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const initialEmail = searchParams.get('email') || '';

  // Screen flow: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Input fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend cooldown timer (60s)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SEND OTP CODE (Sign Up via Supabase signInWithOtp)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError('Please provide your full name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const supabase = createClient();

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (otpError) {
        const msg = otpError.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many requests. Please wait a few moments before trying again.');
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
          setError(otpError.message || 'Could not send verification code. Please try again.');
        }
        return;
      }

      setStep('otp');
      setCooldown(60);
      setSuccessNotice(`Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. VERIFY OTP CODE & COMPLETE PROFILE
  // ─────────────────────────────────────────────────────────────────────────────
  const handleVerifySignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (cleanOtp.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim() || 'Resident';
      const cleanPhone = phone.trim();

      // Verify OTP with Supabase
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      });

      if (verifyErr) {
        const msg = verifyErr.message.toLowerCase();
        if (msg.includes('expired')) {
          setError('This verification code has expired. Please request a new code.');
        } else if (msg.includes('invalid') || msg.includes('token')) {
          setError('Incorrect verification code. Please check your email and try again.');
        } else {
          setError(verifyErr.message || 'Verification failed. Please try again.');
        }
        setOtpCode('');
        return;
      }

      const user = data.user;
      if (!user) {
        throw new Error('Verification completed, but no user was returned.');
      }

      // Ensure profile row exists in Supabase profiles table
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            auth_user_id: user.id,
            full_name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            role: 'customer',
          });
        } else {
          await supabase
            .from('profiles')
            .update({
              full_name: cleanName || existingProfile.full_name,
              phone: cleanPhone || existingProfile.phone,
            })
            .eq('id', existingProfile.id);
        }
      } catch (profileErr) {
        console.warn('Profile sync fallback:', profileErr);
      }

      // Store isolated user session cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'easyfarm_user',
          JSON.stringify({
            id: user.id,
            email: cleanEmail,
            fullName: cleanName,
            phone: cleanPhone,
            role: 'customer',
          })
        );
      }

      // Safe redirect
      if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
        router.push(nextParam);
      } else {
        router.push('/baskets');
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
  const handleResendSignupOtp = async () => {
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
          shouldCreateUser: true,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'customer',
          },
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
          setError(resendErr.message || 'Could not resend verification code.');
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

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F7F8F2]">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: EDITORIAL BRAND STORYTELLING (55% on Desktop)
      ───────────────────────────────────────────────────────────── */}
      <div 
        className="w-full lg:w-[54%] relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 text-white overflow-hidden bg-cover bg-center min-h-[260px] sm:min-h-[320px] lg:min-h-screen"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(14, 38, 27, 0.42) 0%, rgba(14, 38, 27, 0.76) 48%, rgba(10, 29, 21, 0.94) 100%), url('/images/telangana-farm-hero.jpg'), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        {/* Ambient Glow */}
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
            <span>Community Harvest Network</span>
          </div>

          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.15] text-white tracking-tight mb-3 sm:mb-4">
            Bring the farm closer.
          </h1>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal max-w-md hidden sm:block">
            Create your account for a fresher way to shop seasonal produce from Telangana.
          </p>
        </div>

        {/* Bottom: Signature & Trust Attributes */}
        <div className="relative z-10 hidden lg:flex items-center justify-between pt-6 border-t border-white/20">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#A8CC62]">
            FRESHNESS, DELIVERED DIFFERENTLY.
          </span>
          <div className="flex items-center gap-4 text-xs text-white/80">
            <span className="flex items-center gap-1.5">
              <span className="text-[#A8CC62]">✓</span> 100% Transparent Sourcing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#A8CC62]">✓</span> Harvest to Ghatkesar
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

          {/* ──────────────── STEP 2: OTP VERIFICATION ──────────────── */}
          {step === 'otp' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#1D6845]">
                  STEP 2 OF 2
                </span>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-[34px] font-semibold text-[#0B291D] tracking-tight leading-tight">
                  Verify your email.
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
              <form onSubmit={handleVerifySignupOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#17231C] text-center mb-1.5">
                    Enter 6-Digit Code
                  </label>
                  <OtpInput
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
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Verify and Create Account</span>
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
                      onClick={handleResendSignupOtp}
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
                      setStep('form');
                      setOtpCode('');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[#6D7D73] hover:text-[#17231C] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit profile details & email</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ──────────────── STEP 1: CREATE ACCOUNT FORM ──────────────── */
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#1D6845]">
                  JOIN EASY FARM
                </span>
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-[34px] font-semibold text-[#0B291D] tracking-tight leading-tight">
                  Create your account.
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6B62]">
                  A few details to get your fresh-food journey started.
                </p>
              </div>

              {/* Feedback Error */}
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p>{error}</p>
                    {error.includes('already exists') && (
                      <Link
                        href={`/login?email=${encodeURIComponent(email)}`}
                        className="inline-block text-xs font-black text-[#123D2B] underline"
                      >
                        Sign In With This Email →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Sign Up Inputs */}
              <form onSubmit={handleSendSignupOtp} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="signupNameInput" className="block text-xs font-semibold text-[#17231C] mb-2">
                    Full name
                  </label>
                  <div className="relative">
                    <input
                      id="signupNameInput"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ramesh Kumar"
                      className="w-full h-[52px] pl-11 pr-4 rounded-xl bg-white border-[1.5px] border-[#D8DFD2] hover:border-[#B5C0AF] focus:border-[#1D6845] focus:ring-4 focus:ring-[#1D6845]/12 text-base sm:text-sm text-[#17231C] placeholder:text-[#9AA69F] outline-none transition"
                    />
                    <User className="w-5 h-5 text-[#8C9991] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="signupPhoneInput" className="block text-xs font-semibold text-[#17231C]">
                      Phone number
                    </label>
                    <span className="text-[11px] text-[#5B6B62] font-normal">Optional</span>
                  </div>
                  <div className="relative">
                    <input
                      id="signupPhoneInput"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98490 12345"
                      className="w-full h-[52px] pl-11 pr-4 rounded-xl bg-white border-[1.5px] border-[#D8DFD2] hover:border-[#B5C0AF] focus:border-[#1D6845] focus:ring-4 focus:ring-[#1D6845]/12 text-base sm:text-sm text-[#17231C] placeholder:text-[#9AA69F] outline-none transition"
                    />
                    <Phone className="w-5 h-5 text-[#8C9991] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="signupEmailInput" className="block text-xs font-semibold text-[#17231C] mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="signupEmailInput"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      className="w-full h-[52px] pl-11 pr-4 rounded-xl bg-white border-[1.5px] border-[#D8DFD2] hover:border-[#B5C0AF] focus:border-[#1D6845] focus:ring-4 focus:ring-[#1D6845]/12 text-base sm:text-sm text-[#17231C] placeholder:text-[#9AA69F] outline-none transition"
                    />
                    <Mail className="w-5 h-5 text-[#8C9991] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !fullName}
                  className="w-full h-[52px] rounded-xl bg-[#123D2B] hover:bg-[#0B291D] disabled:opacity-50 text-white font-semibold text-sm sm:text-[15px] transition shadow-[0_4px_14px_rgba(18,61,43,0.25)] hover:shadow-[0_6px_20px_rgba(18,61,43,0.35)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending verification code...</span>
                    </>
                  ) : (
                    <span>Send verification code</span>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[#5B6B62] text-center pt-1">
                  <ShieldCheck className="w-4 h-4 text-[#1D6845]" />
                  <span>Secure sign-up with email verification.</span>
                </div>
              </form>

              {/* Footer Links */}
              <div className="pt-6 border-t border-[#E1E6DC] text-center space-y-3.5 text-xs">
                <p className="text-[#5B6B62]">
                  Already have an account?{' '}
                  <Link
                    href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login'}
                    className="font-bold text-[#123D2B] hover:text-[#0B291D] underline"
                  >
                    Sign in
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8F2] flex items-center justify-center text-xs text-[#5B6B62]">Loading sign up...</div>}>
      <SignupFormContent />
    </Suspense>
  );
}
