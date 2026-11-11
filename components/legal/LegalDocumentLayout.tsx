'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { LegalSection } from '@/lib/legal/legal-content';
import { LegalDocument, LegalDocumentVersion, LegalBusinessDetails } from '@/types/legal';
import { ShieldCheck, FileText, Printer, ArrowRight, ChevronDown, ChevronUp, MapPin, Mail, Phone, Calendar, Info } from 'lucide-react';

interface LegalDocumentLayoutProps {
  document: LegalDocument;
  version: LegalDocumentVersion;
  business: LegalBusinessDetails;
  sections: LegalSection[];
  otherDocKey: 'terms-and-conditions' | 'privacy-policy';
  otherDocTitle: string;
}

export function LegalDocumentLayout({
  document,
  version,
  business,
  sections,
  otherDocKey,
  otherDocTitle,
}: LegalDocumentLayoutProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || 'section-1');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (const s of sections) {
        const el = typeof window !== 'undefined' ? window.document.getElementById(s.id) : null;
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSectionId(s.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = typeof window !== 'undefined' ? window.document.getElementById(id) : null;
    if (el) {
      const topOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSectionId(id);
      setMobileTocOpen(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formattedEffectiveDate = new Date(version.effective_date || document.effective_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedPublishedDate = new Date(version.published_at || document.published_at || version.effective_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1">
        {/* HERO BANNER */}
        <section className="bg-gradient-to-br from-[#0B3B2C] via-[#0E4A37] to-[#08281E] text-white py-12 sm:py-16 px-4 border-b border-emerald-900 print:bg-white print:text-black print:py-4">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-700/80 text-emerald-300 text-xs font-bold print:hidden">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Easy Farm Legal Document</span>
              </div>

              {/* Version & Actions */}
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition backdrop-blur-xs cursor-pointer"
                  aria-label="Print Document"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <Link
                  href={`/${otherDocKey}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#6FE343] hover:bg-[#5ec437] text-slate-950 text-xs font-black transition shadow-xs"
                >
                  <span>View {otherDocTitle}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight print:text-black">
                {document.title}
              </h1>
              <p className="text-emerald-200/90 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed print:text-slate-600">
                Authoritative legal terms governing vegetable box purchases, delivery commitments, payment processing, Easy Coins rewards, Weekly Streaks, and platform usage for Easy Farm.
              </p>
            </div>

            {/* METADATA BAR */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-emerald-200/80 border-t border-emerald-800/60 print:text-slate-600 print:border-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-300 print:text-black">Version:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/70 text-emerald-200 font-mono font-bold print:bg-slate-200 print:text-black">
                  v{version.version || document.current_version}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span>Effective Date: <strong>{formattedEffectiveDate}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Last Updated: <strong>{formattedPublishedDate}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span>Jurisdiction: <strong>Hyderabad, Telangana, India</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE TABLE OF CONTENTS ACCORDION */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs px-4 py-2.5 print:hidden">
          <button
            type="button"
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-800"
          >
            <span className="flex items-center gap-2 text-emerald-900 font-black">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Table of Contents ({sections.length} Sections)</span>
            </span>
            {mobileTocOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {mobileTocOpen && (
            <div className="mt-2.5 max-h-60 overflow-y-auto space-y-1 pt-2 border-t border-slate-100 text-xs">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition truncate ${
                    activeSectionId === sec.id
                      ? 'bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold text-slate-400 mr-1.5">{sec.number}.</span>
                  {sec.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN BODY CONTAINER */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* DESKTOP STICKY SIDEBAR (3 COLS) */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4 print:hidden">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-800" />
                    Table of Contents
                  </span>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {sections.length} Sections
                  </span>
                </div>

                <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 text-xs">
                  {sections.map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition flex items-start gap-2 ${
                          isActive
                            ? 'bg-[#0B3B2C] text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
                        }`}
                      >
                        <span className={`shrink-0 font-bold ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
                          {sec.number}.
                        </span>
                        <span className="leading-snug">{sec.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* QUICK CROSS-LINK CARD */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 space-y-2.5">
                <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Related Legal Document
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Review our complete {otherDocTitle} to understand how Easy Farm protects and handles your personal information.
                </p>
                <Link
                  href={`/${otherDocKey}`}
                  className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 underline"
                >
                  <span>Read {otherDocTitle}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </aside>

            {/* DOCUMENT CONTENT (8 COLS) */}
            <article className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">

              {/* NOTICE BANNER */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                <Info className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block mb-0.5 font-bold">Important Customer Notice:</strong>
                  Please read this document carefully before creating an account or placing weekly vegetable orders. By registering or using the Easy Farm website and mobile applications, you explicitly agree to these provisions.
                </div>
              </div>

              {/* RENDERED SECTIONS */}
              <div className="prose prose-slate max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
                {sections.map((sec) => {
                  const sectionPrefix = `### Section ${sec.number}:`;
                  const nextSectionPrefix = `### Section ${sec.number + 1}:`;

                  let sectionText = '';
                  const fullContent = version.content || '';
                  const startIdx = fullContent.indexOf(sectionPrefix);

                  if (startIdx !== -1) {
                    const endIdx = fullContent.indexOf(nextSectionPrefix, startIdx);
                    if (endIdx !== -1) {
                      sectionText = fullContent.substring(startIdx + sectionPrefix.length, endIdx).trim();
                    } else {
                      sectionText = fullContent.substring(startIdx + sectionPrefix.length).trim();
                    }
                  } else {
                    // Fallback to title match
                    const titleIdx = fullContent.indexOf(sec.title);
                    if (titleIdx !== -1) {
                      sectionText = fullContent.substring(titleIdx + sec.title.length, titleIdx + 2000).trim();
                    }
                  }

                  // Split subsections into clean paragraphs
                  const paragraphs = sectionText
                    .split('\n\n')
                    .map((p) => p.trim())
                    .filter(Boolean);

                  return (
                    <section
                      key={sec.id}
                      id={sec.id}
                      className="scroll-mt-24 pt-4 border-t border-slate-100 first:border-t-0 first:pt-0 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-xs font-black shrink-0">
                          {sec.number}
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight m-0">
                          {sec.title}
                        </h2>
                      </div>

                      <div className="space-y-3 pl-0 sm:pl-9 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {paragraphs.map((p, pIdx) => {
                          // Handle bold leadings like 1.1., 1.2., etc.
                          return (
                            <p key={pIdx} className="m-0 text-slate-700 whitespace-pre-line">
                              {p}
                            </p>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* VERIFIED LEGAL CONTACT & GRIEVANCE CARD */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                    Official Entity & Grievance Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Operating Entity</span>
                    <strong className="text-slate-900 block mt-0.5">{business.businessName || 'Easy Farm Fresh Produce'}</strong>
                    <span className="text-slate-500 block text-[11px] mt-0.5">Brand: {business.brandName || 'Easy Farm'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Customer Support Email</span>
                    <a href={`mailto:${business.supportEmail}`} className="text-emerald-800 font-bold hover:underline block mt-0.5">
                      {business.supportEmail || 'business@easyfarm.co.in'}
                    </a>
                    <span className="text-slate-500 block text-[11px] mt-0.5">Phone: {business.supportPhone || '+91 40 8899 7766'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Designated Grievance Officer</span>
                    <strong className="text-slate-900 block mt-0.5">{business.grievanceOfficerName || 'Grievance Redressal Officer'}</strong>
                    <a href={`mailto:${business.grievanceOfficerEmail}`} className="text-emerald-800 font-semibold hover:underline block text-[11px] mt-0.5">
                      {business.grievanceOfficerEmail || 'grievance@easyfarm.co.in'}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Registered Hub & Address</span>
                    <address className="text-slate-700 not-italic block text-[11px] mt-0.5 leading-relaxed">
                      {business.registeredAddress || 'Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088'}
                    </address>
                  </div>
                </div>
              </div>

              {/* BOTTOM CROSS-NAVIGATION */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                <span className="text-xs text-slate-500">
                  Easy Farm Official Legal Repository • Version {version.version}
                </span>

                <Link
                  href={`/${otherDocKey}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <span>Go to {otherDocTitle}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>

          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
        <BottomNav />
      </div>
    </div>
  );
}
