'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  length?: number;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
  length = 6,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  useEffect(() => {
    if (autoFocus && !disabled) {
      // Focus first empty box or box 0
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, []);

  const handleChange = (index: number, char: string) => {
    if (disabled) return;
    const cleanDigit = char.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    onChange(newDigits.join(''));

    // Move to next input box if a digit was entered
    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
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

    // Focus the box following the pasted digits, or the last box
    const focusIndex = Math.min(cleanedDigits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div
      className="flex gap-1.5 sm:gap-2 justify-center my-3 max-w-full overflow-x-auto py-1"
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
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
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
