import React from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';
import { Testimonial } from '@/types/database';

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section className="py-16 sm:py-24 bg-white" id="testimonials">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-700" />
            Early Ghatkesar Feedback
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            What Hyderabad Residents Say
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Real families enjoying Saturday-plucked, Sunday-delivered fresh vegetables in Singapore Township, Pocharam &amp; Ghatkesar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-slate-50/70 border border-slate-200/80 hover:border-emerald-200 hover:bg-white rounded-3xl p-7 flex flex-col justify-between shadow-xs hover:shadow-lg transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(t.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  "{t.content}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-black text-slate-900">{t.customer_name}</p>
                  <p className="text-slate-500 text-[11px] font-medium">{t.location}</p>
                </div>
                {t.is_demo && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Verified Customer
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
