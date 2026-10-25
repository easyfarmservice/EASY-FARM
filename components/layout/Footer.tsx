'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, MessageSquare, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { EasyFarmLogo } from '@/components/ui/Logo';
import { SanityService } from '@/services/sanity.service';

const DEFAULTS = {
  footerAbout: 'Building a fair, transparent food system for Telangana. Connecting local farmers directly with families in Ghatkesar & Pocharam with zero cold storage and guaranteed Sunday freshness.',
  activeZoneName: 'Ghatkesar & Pocharam, Hyderabad (Active)',
  upcomingZones: [
    'Uppal & LB Nagar',
    'Boduppal & Medipally',
    'Peerzadiguda & Narapally',
  ],
  supportEmail: 'support@easyfarm.in',
  supportPhone: '+91 40 8899 7766',
  whatsappNumber: '+91 98490 12345',
  copyrightText: `© ${new Date().getFullYear()} Easy Farm . All rights reserved.`,
};

export function Footer({ settings }: { settings?: any } = {}) {
  const [data, setData] = useState(() => ({ ...DEFAULTS, ...(settings || {}) }));

  useEffect(() => {
    if (!settings) {
      SanityService.getSiteSettings().then((res) => {
        if (res) {
          setData((prev: any) => ({
            ...prev,
            footerAbout: res.footerAbout || prev.footerAbout,
            activeZoneName: res.activeZoneName || prev.activeZoneName,
            upcomingZones: res.upcomingZones && res.upcomingZones.length > 0 ? res.upcomingZones : prev.upcomingZones,
            supportEmail: res.supportEmail || prev.supportEmail,
            supportPhone: res.supportPhone || prev.supportPhone,
            copyrightText: res.copyrightText || prev.copyrightText,
          }));
        }
      }).catch(() => null);
    }
  }, [settings]);

  const cleanWhatsapp = (data.whatsappNumber || '+91 98490 12345').replace(/[^\d]/g, '');

  return (
    <footer className="bg-emerald-950 text-emerald-100/80 pt-16 pb-12 border-t border-emerald-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-emerald-900/60">
          {/* BRAND COLUMN */}
          <div className="lg:col-span-4 space-y-4">
            <EasyFarmLogo variant="full" size="md" lightMode={true} showSubtitle={true} />

            <p className="text-xs sm:text-sm text-emerald-200/70 leading-relaxed max-w-sm">
              {data.footerAbout}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/70 border border-emerald-800 text-xs text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Farm-To-Kitchen Certified</span>
            </div>
          </div>

          {/* QUICK NAVIGATION */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-white font-extrabold text-xs tracking-wider uppercase">
              Our Boxes & Sourcing
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/baskets/staple-basket" className="hover:text-white transition flex items-center gap-1">
                  <span>Staple Box</span>
                </Link>
              </li>
              <li>
                <Link href="/baskets/custom-basket" className="hover:text-white transition flex items-center gap-1">
                  <span>Custom Box</span>
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition flex items-center gap-1">
                  <span>How It Works</span>
                </Link>
              </li>
              <li>
                <Link href="/location" className="hover:text-white transition flex items-center gap-1">
                  <span>Delivery Coverage Map</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* ACTIVE & UPCOMING DELIVERY ZONES */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-white font-extrabold text-xs tracking-wider uppercase">
              Service Areas
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Active Delivery</span>
                </div>
                <div className="text-white font-semibold text-[11px]">{data.activeZoneName}</div>
              </div>

              <div className="pt-1">
                <span className="text-emerald-400/60 text-[11px] font-bold block mb-1">Upcoming Expansion:</span>
                <ul className="space-y-1 text-emerald-300/60 text-[11px]">
                  {data.upcomingZones.map((zone: string, idx: number) => (
                    <li key={idx}>• {zone}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* CONTACT & SUPPORT */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-white font-extrabold text-xs tracking-wider uppercase">
              Customer Support
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href={`tel:${data.supportPhone}`} className="hover:text-white transition flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{data.supportPhone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=Hi%20EasyFarm,%20I%20need%20help`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>WhatsApp: {data.whatsappNumber || '+91 98490 12345'}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${data.supportEmail}`} className="hover:text-white transition flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{data.supportEmail}</span>
                </a>
              </li>
              <li className="pt-2 text-xs text-emerald-400/60 flex items-center gap-3">
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                <span>•</span>
                <Link href="/terms" className="hover:underline">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400/60 gap-4">
          <p>{data.copyrightText}</p>
          <div className="flex items-center gap-2">
            <span>🌿</span>
            <span>Harvested Saturday • Delivered Sunday • Zero Cold Storage</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
