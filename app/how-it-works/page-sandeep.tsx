import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { HowItWorks } from '@/components/home/HowItWorks';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SanityService } from '@/services/sanity.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'How Easy Farm Works | Telangana Farm-to-Door Delivery',
  description: 'Learn how weekly order cutoffs on Saturday enable fresh harvests and Sunday deliveries in Ghatkesar & Pocharam.',
};

const DEFAULT_CUTOFF_POINTS = [
  {
    title: 'Zero Food Waste',
    text: 'Farmers pluck only what Ghatkesar & Pocharam families have confirmed.',
  },
  {
    title: 'Unsurpassed Freshness',
    text: 'Vegetables do not sit in cold stores for weeks.',
  },
  {
    title: 'Fair Pricing',
    text: 'No loss from unsold inventory means lower prices for you and higher earnings for Telangana farmers.',
  },
];

export default async function HowItWorksPage() {
  const [howPageData, homeContent] = await Promise.all([
    SanityService.getHowItWorksPage().catch(() => null),
    SanityService.getHomePageContent().catch(() => null),
  ]);

  const bannerTitle = howPageData?.bannerTitle || 'How Easy Farm Works';
  const bannerSubtitle = howPageData?.bannerSubtitle || 'A zero-warehouse, harvest-to-order weekly supply chain.';
  const cutoffBoxTitle = howPageData?.cutoffBoxTitle || 'Why the Saturday Cutoff Matters:';
  const cutoffPoints = howPageData?.cutoffPoints && howPageData.cutoffPoints.length > 0
    ? howPageData.cutoffPoints
    : DEFAULT_CUTOFF_POINTS;
  const ctaButtonText = howPageData?.ctaButtonText || "Order This Week's Basket";

  return (
    <div className="min-h-screen flex flex-col bg-white pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <div className="bg-emerald-950 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black">{bannerTitle}</h1>
            <p className="text-emerald-200 text-sm sm:text-base">
              {bannerSubtitle}
            </p>
          </div>
        </div>

        <HowItWorks
          tagline={homeContent?.howTagline}
          title={homeContent?.howTitle}
          subtitle={homeContent?.howSubtitle}
          steps={homeContent?.howSteps}
        />

        {/* DETAILED FAQ & CTAS */}
        <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 space-y-4">
            <h2 className="text-xl font-bold text-emerald-950">{cutoffBoxTitle}</h2>
            <div className="space-y-2 text-sm text-emerald-900 leading-relaxed">
              {cutoffPoints.map((point: any, idx: number) => (
                <p key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>{point.title}:</strong> {point.text}
                  </span>
                </p>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/baskets"
                className="inline-flex items-center px-6 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow transition"
              >
                {ctaButtonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
