'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RazorpayButton } from '@/components/checkout/RazorpayButton';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function TestPaymentPage() {
  const [testAmount, setTestAmount] = useState<number>(1);
  const [lastPayment, setLastPayment] = useState<any>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-xl mx-auto w-full py-12 px-4">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Razorpay Standard Checkout Test
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Razorpay Payment Verification
            </h1>
            <p className="text-xs text-slate-500">
              Test standard modal checkout, order creation, and backend HMAC-SHA256 signature verification in test mode.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Select Test Payment Amount (INR):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTestAmount(amt)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                    testAmount === amt
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ₹{amt} ({amt * 100} paise)
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Razorpay Key ID:</span>
              <code className="text-slate-900 font-bold font-mono">
                {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'Not Configured'}
              </code>
            </div>
            <div className="flex justify-between">
              <span>Order Amount:</span>
              <span className="font-bold text-slate-900">₹{testAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="font-bold text-emerald-700 uppercase">Test Mode</span>
            </div>
          </div>

          <RazorpayButton
            amount={testAmount}
            receipt={`test_rcpt_${Date.now()}`}
            customerName="Easy Farm Tester"
            customerEmail="test@easyfarm.in"
            customerPhone="9876543210"
            buttonText={`Pay ₹${testAmount.toFixed(2)} with Razorpay`}
            onSuccess={(data) => {
              setLastPayment(data);
            }}
          />

          {lastPayment && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified by Server (HMAC-SHA256 Match):
              </div>
              <div className="text-[11px] font-mono text-slate-700 space-y-0.5 break-all">
                <p>Order ID: {lastPayment.order_id}</p>
                <p>Payment ID: {lastPayment.payment_id}</p>
                <p>Signature: {lastPayment.signature}</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
