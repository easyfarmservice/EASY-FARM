import React from 'react';
import { CalendarCheck, Sprout, Truck, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_STEPS = [
  {
    step: '01',
    title: 'Order by Saturday 11:00 PM',
    description:
      'Choose your preferred weekly vegetable basket before Saturday 11:00 PM so our partner farmers can plan harvesting without waste.',
  },
  {
    step: '02',
    title: 'Harvested Fresh on Saturday',
    description:
      'Local Telangana farmers pluck vegetables on Saturday morning based on confirmed orders. Zero cold storage, no artificial waxes.',
  },
  {
    step: '03',
    title: 'Delivered Sunday by 6 PM',
    description:
      'Produce is quality checked, sorted, packed into eco-friendly boxes, and delivered straight to your door every Sunday.',
  },
];

const STEP_ICONS = [CalendarCheck, Sprout, Truck];

export function HowItWorks({
  tagline,
  title,
  subtitle,
  steps,
}: {
  tagline?: string;
  title?: string;
  subtitle?: string;
  steps?: Array<{ step?: string; title: string; description: string }>;
}) {
  const displaySteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const displayTagline = tagline || 'Simple Weekly Routine';
  const displayTitle = title || 'How Easy Farm Works';
  const displaySubtitle =
    subtitle ||
    'Eliminating middleman markups and food waste through our direct harvest-to-order weekly supply chain.';

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-y border-slate-100 scroll-mt-16" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
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

        {/* 3 STEPS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {displaySteps.map((s, idx) => {
            const Icon = STEP_ICONS[idx % STEP_ICONS.length] || CalendarCheck;
            const stepNum = s.step || `0${idx + 1}`;
            return (
              <div
                key={stepNum}
                className="bg-white rounded-3xl p-7 sm:p-8 border border-emerald-100/80 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all duration-300 relative flex flex-col justify-between group"
              >
                <div>
                  {/* ICON & STEP NUMBER */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shadow-xs group-hover:bg-emerald-800 group-hover:text-white transition-colors duration-300">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-3xl sm:text-4xl font-black text-emerald-950/20 group-hover:text-emerald-800/30 transition-colors">
                      {stepNum}
                    </span>
                  </div>

                  {/* STEP TITLE & DESCRIPTION */}
                  <h3 className="text-xl font-black text-slate-900 mb-2.5 tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* BOTTOM ACCENT INDICATOR */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Step {idx + 1} of 3</span>
                  <span className="text-emerald-600 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM CTA PROMPT */}
        <div className="text-center mt-12 sm:mt-16">
          <Link
            href="#boxes"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition shadow-md"
          >
            <span>Explore This Week's Boxes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
