'use client';

import React from 'react';

export type LoaderSize = 'sm' | 'md' | 'lg' | 'xl';

interface EasyFarmLoaderProps {
  /**
   * Preset sizes:
   * - sm: Logo ~32px, Ring ~52px
   * - md: Logo ~44px, Ring ~72px
   * - lg: Logo ~68px, Ring ~108px
   * - xl: Logo ~88px, Ring ~140px
   */
  size?: LoaderSize;
  /**
   * Optional helper text displayed below the loader
   */
  text?: string;
  /**
   * Optional secondary subtitle text
   */
  subtitle?: string;
  /**
   * Additional container class names
   */
  className?: string;
  /**
   * Center the loader inside its parent with padding (default: true)
   */
  center?: boolean;
  /**
   * Inline mode for buttons / small rows (default: false)
   */
  inline?: boolean;
}

const SIZE_CONFIG: Record<
  LoaderSize,
  {
    ringSize: number;
    logoWidth: number;
    strokeWidth: number;
    textSize: string;
    subtextSize: string;
  }
> = {
  sm: {
    ringSize: 52,
    logoWidth: 30,
    strokeWidth: 2.5,
    textSize: 'text-xs',
    subtextSize: 'text-[10px]',
  },
  md: {
    ringSize: 72,
    logoWidth: 44,
    strokeWidth: 3,
    textSize: 'text-sm',
    subtextSize: 'text-xs',
  },
  lg: {
    ringSize: 108,
    logoWidth: 68,
    strokeWidth: 3.5,
    textSize: 'text-base',
    subtextSize: 'text-xs',
  },
  xl: {
    ringSize: 140,
    logoWidth: 88,
    strokeWidth: 4,
    textSize: 'text-lg',
    subtextSize: 'text-sm',
  },
};

export function EasyFarmLoader({
  size = 'md',
  text,
  subtitle,
  className = '',
  center = true,
  inline = false,
}: EasyFarmLoaderProps) {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const radius = (config.ringSize - config.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // 65% arc length for smooth rotation
  const strokeDasharray = `${circumference * 0.65} ${circumference * 0.35}`;

  const loaderVisual = (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: `${config.ringSize}px`,
        height: `${config.ringSize}px`,
      }}
      role="status"
      aria-label={text || 'Loading Easy Farm'}
    >
      {/* Surrounding Animated Ring (Only the ring rotates; logo stays stationary) */}
      <svg
        className="absolute inset-0 w-full h-full animate-[spin_1.1s_linear_infinite] motion-reduce:animate-none pointer-events-none"
        viewBox={`0 0 ${config.ringSize} ${config.ringSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Subtle background track */}
        <circle
          cx={config.ringSize / 2}
          cy={config.ringSize / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={config.strokeWidth}
          className="opacity-60"
        />
        {/* Animated Brand Green Arc */}
        <circle
          cx={config.ringSize / 2}
          cy={config.ringSize / 2}
          r={radius}
          stroke="#065f46" // Rich Easy Farm emerald-800
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          className="opacity-95"
        />
      </svg>

      {/* Reduced motion static highlight accent */}
      <div className="hidden motion-reduce:block absolute inset-0 rounded-full border-2 border-emerald-600/30" />

      {/* Exact Official Easy Farm Logo (Strictly stationary, maintains exact 1024x887 proportions) */}
      <div
        className="relative z-10 flex items-center justify-center transition-transform select-none pointer-events-none"
        style={{
          width: `${config.logoWidth}px`,
          height: `${Math.round(config.logoWidth * (887 / 1024))}px`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/easyfarm-logo.png"
          alt="Easy Farm"
          width={config.logoWidth}
          height={Math.round(config.logoWidth * (887 / 1024))}
          className="w-full h-full object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {loaderVisual}
        {text && <span className={`font-medium text-slate-700 ${config.textSize}`}>{text}</span>}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${center ? 'py-8 px-4' : ''} ${className}`}
    >
      {loaderVisual}

      {(text || subtitle) && (
        <div className="mt-4 text-center max-w-xs space-y-1">
          {text && (
            <p className={`font-bold text-slate-800 tracking-tight leading-snug ${config.textSize}`}>
              {text}
            </p>
          )}
          {subtitle && (
            <p className={`text-slate-500 font-medium ${config.subtextSize}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
