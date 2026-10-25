import React from 'react';
import { Leaf, Award, Calendar, DollarSign, MapPin, Sparkles } from 'lucide-react';

const DEFAULT_BENEFITS = [
  {
    title: 'Freshly Harvested',
    description: 'Vegetables are plucked within 24 hours of delivery. No cold storage, no chemical wax spraying.',
  },
  {
    title: 'Farmer Direct',
    description: 'We connect directly with Telangana smallholder farmers, ensuring complete harvest traceability.',
  },
  {
    title: 'Weekly Convenience',
    description: 'Subscribe or order weekly before the Thursday cutoff. Your Sunday kitchen stock is sorted automatically.',
  },
  {
    title: 'Transparent Pricing',
    description: 'No hidden surge pricing or artificial markups. Premium farm-quality vegetables at honest rates.',
  },
  {
    title: 'Local Telangana Produce',
    description: 'Support local agriculture in Chevella, Shankarpally, and surrounding farming clusters.',
  },
  {
    title: 'Reliable Sunday Delivery',
    description: 'Uniform doorstep drops across Ghatkesar gated communities and standalone homes before 6 PM.',
  },
];

const BENEFIT_ICONS = [Leaf, Award, Calendar, DollarSign, MapPin, Sparkles];

export function WhyEasyFarm({
  tagline,
  title,
  subtitle,
  benefits,
}: {
  tagline?: string;
  title?: string;
  subtitle?: string;
  benefits?: Array<{ title: string; description: string }>;
}) {
  const displayBenefits = benefits && benefits.length > 0 ? benefits : DEFAULT_BENEFITS;
  const displayTagline = tagline || 'Why Choose Easy Farm';
  const displayTitle = title || 'Better for You. Fairer for Farmers.';
  const displaySubtitle =
    subtitle ||
    'We are building a transparent, direct supply chain that brings fresh regional produce straight from soil to kitchen.';

  return (
    <section className="py-16 md:py-24 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {displayTagline}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayBenefits.map((item, idx) => {
            const IconComponent = BENEFIT_ICONS[idx % BENEFIT_ICONS.length] || Leaf;
            return (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 hover:bg-white hover:border-emerald-500 hover:shadow-lg transition-all duration-300 space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md group-hover:bg-emerald-700 transition">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
