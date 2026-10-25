import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, QrCode, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Farmer } from '@/types/database';

interface FarmerTransparencyProps {
  farmers: Farmer[];
}

export function FarmerTransparency({ farmers }: FarmerTransparencyProps) {
  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-100 relative overflow-hidden" id="transparency">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* LEFT MESSAGE */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
              Fair Sourcing Commitment
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              We believe farmers should earn more.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              We pay local Telangana smallholders 15% above the applicable mandi benchmark for eligible produce. Every weekly basket comes with complete harvest and batch traceability.
            </p>

            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">QR Batch Traceability</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Scan the QR code on your basket to see exact farmer payouts and harvest village.</p>
                </div>
              </div>
            </div>

            <Link
              href="/farmers"
              className="inline-flex items-center text-sm font-bold text-emerald-800 hover:text-emerald-950 transition group"
            >
              <span>Explore Telangana Farmer Profiles & Transparency Logs</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {/* RIGHT FARMER CARDS */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {farmers.slice(0, 3).map((f) => (
              <div
                key={f.id}
                className="bg-white border border-emerald-100/80 rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group"
              >
                <div>
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden mb-4 border-2 border-emerald-100 bg-emerald-50 shadow-xs">
                    <Image
                      src={f.photo_url || '/images/hero-vegetables.png'}
                      alt={f.name}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <h3 className="font-black text-base text-slate-900">{f.name}</h3>
                  <p className="text-xs font-bold text-emerald-700">{f.village}, {f.district}</p>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{f.description}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Partner</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
