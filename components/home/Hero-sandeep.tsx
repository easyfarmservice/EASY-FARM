'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sprout, ShieldCheck, Truck, Users } from 'lucide-react';

export function Hero({ initialContent }: { initialContent?: any } = {}) {
  return (
    <section className="relative w-full overflow-hidden bg-slate-900 min-h-[560px] sm:min-h-[600px] lg:min-h-[640px] xl:min-h-[680px] flex items-center">
      {/* CINEMATIC BACKGROUND IMAGE */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/images/telangana-farm-hero.jpg"
          alt="Fresh Telangana Farm with farmers and harvest basket of vegetables"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_center] md:object-[75%_center] lg:object-center select-none"
          quality={92}
        />
        {/* LEFT GRADIENT OVERLAY (Ensures text is 100% readable while keeping farm & basket vibrant) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent sm:from-black/80 sm:via-black/50 sm:to-black/10 lg:from-black/80 lg:via-black/45 lg:to-transparent" />
        {/* SUBTLE VERTICAL VIGNETTE */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/25" />
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <div className="max-w-xl lg:max-w-2xl space-y-6 sm:space-y-7">
          {/* EYEBROW */}
          <div className="inline-block">
            <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-emerald-300 drop-shadow-sm">
              FRESH FROM TELANGANA FARMS
            </span>
          </div>

          {/* MAIN HEADLINE */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl xl:text-[62px] font-bold text-white tracking-tight leading-[1.12] drop-shadow-md">
            Fresh Vegetables{' '}
            <span className="text-[#6FE343] inline-flex items-center gap-1.5 flex-wrap">
              Delivered to Your Door
              <svg
                className="w-7 h-7 sm:w-9 sm:h-9 text-[#6FE343] inline-block shrink-0 -mt-1"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
              </svg>
            </span>
          </h1>

          {/* SUPPORTING TEXT */}
          <p className="text-sm sm:text-base lg:text-lg text-white/90 font-normal leading-relaxed max-w-xl drop-shadow-sm">
            Handpicked weekly from local Telangana farms on Saturday, delivered fresh to your doorstep in Ghatkesar &amp; Pocharam every Sunday.
          </p>

          {/* COMPACT BENEFITS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-3 pb-1 border-t border-white/20">
            <div className="flex items-center gap-2.5">
              <Sprout className="w-5 h-5 text-[#6FE343] shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">Farm Fresh</p>
                <p className="text-white/70 text-[11px] leading-tight mt-0.5">Direct from farmers</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#6FE343] shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">No Harmful</p>
                <p className="text-white/70 text-[11px] leading-tight mt-0.5">Chemicals</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-[#6FE343] shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">On Time</p>
                <p className="text-white/70 text-[11px] leading-tight mt-0.5">Delivery</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#6FE343] shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">Support</p>
                <p className="text-white/70 text-[11px] leading-tight mt-0.5">Local Farmers</p>
              </div>
            </div>
          </div>

          {/* CALL TO ACTION BUTTONS */}
          <div className="flex items-center gap-4 pt-2">
            <Link
              href="#boxes"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#6FE343] hover:bg-[#5ecf34] text-[#0A381F] font-bold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Shop Now</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 stroke-[2.5]" />
            </Link>

            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-transparent hover:bg-white/10 text-white font-bold text-sm sm:text-base border border-white/80 hover:border-white transition-all duration-200 backdrop-blur-xs"
            >
              How It Works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
