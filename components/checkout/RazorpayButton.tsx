'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { CreditCard, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RazorpayButtonProps {
  amount: number; // in Rupees
  receipt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  onSuccess?: (paymentData: {
    order_id: string;
    payment_id: string;
    signature: string;
  }) => void;
  onError?: (errorMessage: string) => void;
  className?: string;
  buttonText?: string;
}

export function RazorpayButton({
  amount,
  receipt,
  customerName = 'Valued Customer',
  customerEmail = '',
  customerPhone = '',
  notes,
  onSuccess,
  onError,
  className = '',
  buttonText,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountInPaise = Math.round(amount * 100);

  const loadScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const isLoaded = await loadScript();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Call backend create-order endpoint (amount in paise, minimum 100 paise)
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.max(100, amountInPaise),
          currency: 'INR',
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize payment order on server');
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Easy Farm',
        description: 'Standard Web Checkout',
        image: '/images/easyfarm-logo.png',
        order_id: orderData.order_id,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setLoading(true);

            // 4. Send payment_id, order_id, signature to backend verify endpoint
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Signature verification failed.');
            }

            setSuccess(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
            setLoading(false);

            if (onSuccess) {
              onSuccess({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
            }
          } catch (vErr: any) {
            const msg = vErr.message || 'Signature verification failed';
            setError(msg);
            setLoading(false);
            if (onError) onError(msg);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#065F46', // Easy Farm rich emerald
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('Razorpay checkout modal closed by user');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', function (resp: any) {
        console.error('Payment failed:', resp.error);
        const failMsg = `Payment Failed: ${resp.error?.description || resp.error?.reason || 'Transaction could not be completed'}`;
        setError(failMsg);
        setLoading(false);
        if (onError) onError(failMsg);
      });

      rzp.open();
    } catch (err: any) {
      const msg = err.message || 'Unable to start checkout';
      setError(msg);
      setLoading(false);
      if (onError) onError(msg);
    }
  };

  return (
    <div className="w-full space-y-2">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || amount <= 0}
        className={
          className ||
          'w-full py-3.5 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-black text-base transition shadow-md flex items-center justify-center gap-2 cursor-pointer'
        }
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText || `Pay ₹${amount.toFixed(2)} with Razorpay`}</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{success}</div>
        </div>
      )}
    </div>
  );
}
