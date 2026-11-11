'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PendingDoc {
  key: 'terms-and-conditions' | 'privacy-policy';
  title: string;
  currentVersion: string;
  summaryOfChanges?: string;
}

export function RenewedAcceptanceModal() {
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only check for logged-in customers
    const checkAcceptance = async () => {
      try {
        const res = await fetch('/api/legal/check-acceptance');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.requiresReacceptance && Array.isArray(data.pendingDocuments)) {
            setPendingDocs(data.pendingDocuments);
          }
        }
      } catch (err) {
        console.warn('Renewed legal acceptance check notice:', err);
      }
    };

    checkAcceptance();
  }, []);

  if (pendingDocs.length === 0) {
    return null;
  }

  const handleConfirmReacceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please select the checkbox to accept the updated legal policy.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptanceSource: 'website',
          eventType: 'reacceptance',
          metadata: {
            reason: 'Material policy update renewed acceptance',
            pendingCount: pendingDocs.length,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPendingDocs([]);
      } else {
        setError(data.error || 'Could not record acceptance. Please try again.');
      }
    } catch {
      setError('Network error recording acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              Policy Update Required
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Important Updates to Our Terms
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Easy Farm has updated its legal terms and privacy provisions. To continue using your account, placing orders, and claiming loyalty rewards, please review and accept the revised documents below:
        </p>

        {/* Updated Documents List */}
        <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
          {pendingDocs.map((doc) => (
            <div key={doc.key} className="space-y-1 pb-2 border-b border-slate-200/60 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${doc.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-900 hover:underline flex items-center gap-1 text-sm"
                >
                  <span>{doc.title}</span>
                  <span className="text-[11px] font-mono text-slate-500">(v{doc.currentVersion})</span>
                </Link>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Action Required
                </span>
              </div>
              {doc.summaryOfChanges && (
                <p className="text-[11px] text-slate-600 leading-normal pl-0.5">
                  Summary: {doc.summaryOfChanges}
                </p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirmReacceptance} className="space-y-5">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (error) setError(null);
              }}
              className="w-4 h-4 mt-0.5 rounded border border-slate-300 text-emerald-800 focus:ring-2 focus:ring-emerald-700 shrink-0 cursor-pointer accent-emerald-800"
            />
            <span className="leading-relaxed">
              I agree to the updated{' '}
              <Link
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-800 underline"
              >
                Terms &amp; Conditions
              </Link>{' '}
              and acknowledge that I have read the updated{' '}
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-800 underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !agreed}
            className="w-full py-3.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 disabled:opacity-50 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Confirming Acceptance...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Accept and Continue</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

