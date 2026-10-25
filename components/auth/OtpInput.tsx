'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  length?: number;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
  length = 6,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Ensure digits is always an array of exactly `length` strings
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && !disabled) {
      // Focus first empty box or box 0
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, []);

  const handleInput = (index: number, rawInput: string) => {
    if (disabled) return;

    // Handle multiple digits (e.g. mobile keyboard autofill or paste)
    const cleanedDigits = rawInput.replace(/\D/g, '');
    if (!cleanedDigits) {
      // User cleared the box
      const newDigits = [...digits];
      newDigits[index] = '';
      const newVal = newDigits.join('');
      onChange(newVal);
      return;
    }

    if (cleanedDigits.length > 1) {
      // Multi-digit paste or browser autofill
      const newDigits = [...digits];
      for (let i = 0; i < cleanedDigits.length && index + i < length; i++) {
        newDigits[index + i] = cleanedDigits[i];
      }
      const newVal = newDigits.join('').slice(0, length);
      onChange(newVal);

      // Focus the next empty box or the last box
      const nextFocus = Math.min(index + cleanedDigits.length, length - 1);
      inputRefs.current[nextFocus]?.focus();

      if (newVal.length === length) {
        onComplete?.(newVal);
      }
      return;
    }

    // Single digit entry
    const cleanDigit = cleanedDigits.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const newVal = newDigits.join('').slice(0, length);
    onChange(newVal);

    // Advance focus to next input
    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all digits are filled, notify onComplete
    if (newVal.length === length) {
      onComplete?.(newVal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is already empty: move to previous box and clear it
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newVal = newDigits.join('');
        onChange(newVal);
        inputRefs.current[index - 1]?.focus();
      } else if (digits[index]) {
        // Clear current box
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = '';
        const newVal = newDigits.join('');
        onChange(newVal);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleanedDigits = pastedText.replace(/\D/g, '').slice(0, length);
    if (!cleanedDigits) return;

    onChange(cleanedDigits);

    const focusIndex = Math.min(cleanedDigits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (cleanedDigits.length === length) {
      onComplete?.(cleanedDigits);
    }
  };

  return (
    <div
      className="flex gap-2 sm:gap-2.5 justify-center my-3 max-w-full overflow-x-auto py-1"
      onPaste={handlePaste}
      role="group"
      aria-label={`${length}-digit verification code`}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all outline-none select-none ${
            hasError
              ? 'border-rose-400 bg-rose-50/50 text-rose-950 focus:border-rose-600 focus:ring-4 focus:ring-rose-100'
              : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100/70 hover:border-slate-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
          aria-label={`Digit ${i + 1} of verification code`}
        />
      ))}
    </div>
  );
}

/**
 * Mask an email address for privacy-conscious display:
 * e.g. "jeshwanth@anurag.edu.in" -> "j***h@anurag.edu.in"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${'*'.repeat(Math.min(local.length - 2, 4))}${last}@${domain}`;
}
