'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const DEFAULT_FAQS = [
  {
    q: 'Where do you deliver?',
    a: 'Easy Farm currently delivers to selected gated communities and residential localities in Ghatkesar & Pocharam, Hyderabad — including Singapore Township, Sanskruti Township, Rajeev Gruha Kalpa, Modi Emerald Heights, and surrounding residences.',
  },
  {
    q: 'When do weekly orders close?',
    a: 'Weekly orders close every Saturday at 11:00 PM. This gives our partner Telangana farmers clear visibility to prepare fresh Sunday morning harvests according to exact demand, eliminating waste and food storage.',
  },
  {
    q: 'When are vegetables harvested and delivered?',
    a: 'Vegetables are plucked fresh from Telangana farm soil, quality checked, sorted, packed into eco-friendly boxes, and delivered straight to your doorstep every Sunday before 6 PM.',
  },
  {
    q: 'How are farmers paid?',
    a: 'We operate on a transparent direct-to-farmer model. We pay our partner farmers 15% above the prevailing mandi benchmark for eligible produce, ensuring fair, predictable, and dignified livelihoods.',
  },
  {
    q: 'Can I swap items or customize my box?',
    a: 'Yes! Our Staple Box allows up to 3 flexible item swaps from this week’s eligible seasonal harvest. If you want full control, you can choose the Custom Box to pick any vegetables and custom quantities from our full Telangana catalogue.',
  },
  {
    q: 'Can I change my address or cancel my order?',
    a: 'Yes, you can edit your address or cancel your order anytime before Saturday 11:00 PM directly from your customer account page or by messaging our support team.',
  },
];

export function FAQ({
  tagline,
  title,
  faqs,
}: {
  tagline?: string;
  title?: string;
  faqs?: Array<{ q: string; a: string }>;
} = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const displayFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;
  const displayTagline = tagline || 'Got Questions?';
  const displayTitle = title || 'Frequently Asked Questions';

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-200/80" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
            {displayTagline}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Everything you need to know about our weekly farm harvest, delivery schedules, and box options.
          </p>
        </div>

        {/* ACCORDION ITEMS */}
        <div className="space-y-3.5">
          {displayFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:border-emerald-300 transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-4.5 text-left font-extrabold text-slate-900 flex items-center justify-between text-base sm:text-lg hover:bg-emerald-50/40 transition min-h-[56px]"
                >
                  <span className="pr-4">{faq.q}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
