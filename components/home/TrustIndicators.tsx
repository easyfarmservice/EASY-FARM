import React from 'react';
import { Sprout, ShieldCheck, HeartHandshake, Truck } from 'lucide-react';

const DEFAULT_INDICATORS = [
  {
    title: '100% Local Telangana Produce',
    description: 'Harvested directly from partner farms in Chevella, Shankarpally & Medak.',
  },
  {
    title: 'Farmer-First Transparent Pricing',
    description: 'Eliminating middleman margins so farmers earn fair, sustainable payouts.',
  },
  {
    title: 'Zero Cold Storage Processing',
    description: 'Picked Saturday morning, packed fresh, and delivered to your home by Sunday.',
  },
  {
    title: 'Guaranteed Sunday Morning Delivery',
    description: 'Scheduled weekly deliveries directly to gated communities & homes in Ghatkesar.',
  },
];

const ICONS = [Sprout, HeartHandshake, ShieldCheck, Truck];

export function TrustIndicators({
  indicators,
}: {
  indicators?: Array<{ title: string; description: string }>;
}) {
  const displayItems = indicators && indicators.length > 0 ? indicators : DEFAULT_INDICATORS;

  return (
    <section className="bg-emerald-50/50 border-y border-emerald-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayItems.map((item, idx) => {
            const IconComponent = ICONS[idx % ICONS.length] || Sprout;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-3xl border border-emerald-100/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex items-start gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100/80 group-hover:bg-emerald-800 group-hover:text-white transition-colors duration-300 shadow-2xs">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
