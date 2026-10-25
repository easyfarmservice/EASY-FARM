import React from 'react';
import { UserCheck, Scissors, CheckCircle, PackageCheck, Truck, Home, Sparkles } from 'lucide-react';

const DEFAULT_PIPELINE_STEPS = [
  { label: '1. Local Farmer', desc: 'Partnered smallholders in Telangana' },
  { label: '2. Fresh Harvest', desc: 'Plucked Saturday morning' },
  { label: '3. Quality Check', desc: 'Sorted & graded for purity' },
  { label: '4. Eco Packing', desc: 'Zero-plastic ventilated boxes' },
  { label: '5. Fast Dispatch', desc: 'Temperature-managed vehicles' },
  { label: '6. Doorstep Drop', desc: 'Delivered Sunday before 6 PM' },
];

const PIPELINE_ICONS = [UserCheck, Scissors, CheckCircle, PackageCheck, Truck, Home];

export function FarmJourney({
  tagline,
  title,
  subtitle,
  steps,
}: {
  tagline?: string;
  title?: string;
  subtitle?: string;
  steps?: Array<{ label: string; desc: string }>;
}) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_PIPELINE_STEPS;
  const displayTagline = tagline || 'Farm-To-Home Pipeline';
  const displayTitle = title || 'The 36-Hour Freshness Journey';
  const displaySubtitle =
    subtitle || 'Follow the journey of your weekly vegetables from regional Telangana farms straight to your Ghatkesar dining table.';

  return (
    <section className="py-16 md:py-24 bg-white border-b border-slate-100 relative overflow-hidden" id="journey">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            {displayTagline}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displaySteps.map((st, idx) => {
            const Icon = PIPELINE_ICONS[idx % PIPELINE_ICONS.length] || CheckCircle;
            return (
              <div
                key={idx}
                className="bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/80 rounded-2xl p-5 text-center flex flex-col items-center space-y-3 transition shadow-xs hover:shadow-md group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">{st.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
