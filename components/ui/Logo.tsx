import React from 'react';
import Link from 'next/link';

interface EasyFarmLogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
  href?: string;
  lightMode?: boolean;
}

export function EasyFarmLogo({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = false,
  href = '/',
  lightMode = false,
}: EasyFarmLogoProps) {
  // Dimension presets
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-lg' },
    md: { icon: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-xl sm:text-2xl' },
    lg: { icon: 'w-11 h-11 sm:w-12 sm:h-12', text: 'text-2xl sm:text-3xl' },
    xl: { icon: 'w-16 h-16 sm:w-20 sm:h-20', text: 'text-5xl' },
  };

  const currentSize = sizeMap[size];
  const textColor = lightMode ? 'text-white' : 'text-[#004323]';
  const subtitleColor = lightMode ? 'text-emerald-300' : 'text-emerald-700';

  const content = (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 group cursor-pointer ${className}`}>
      {/* Exact Uploaded Easy Farm Logo Mark Image */}
      <div className={`${currentSize.icon} relative flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/easyfarm-logo.png"
          alt="Easy Farm Logo"
          className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Clean Styled Typography for Name — Fraunces Artisanal Serif */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center min-w-0">
          <span className={`${currentSize.text} font-[family-name:var(--font-fraunces)] font-bold ${textColor} tracking-tight leading-none`}>
            Easy Farm
          </span>
          {showSubtitle && (
            <span className={`text-[9px] sm:text-[10px] font-sans font-bold ${subtitleColor} tracking-[0.14em] uppercase leading-none mt-1`}>
              Telangana Fresh
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
