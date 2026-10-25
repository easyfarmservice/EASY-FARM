import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Hero } from '@/components/home/Hero';
import { ServiceabilityCheck } from '@/components/home/ServiceabilityCheck';
import { HowItWorks } from '@/components/home/HowItWorks';
import { BasketShowcase } from '@/components/home/BasketShowcase';
import { FarmJourney } from '@/components/home/FarmJourney';
import { Testimonials } from '@/components/home/Testimonials';
import { FAQ } from '@/components/home/FAQ';
import { BasketService } from '@/services/basket.service';
import { SanityService } from '@/services/sanity.service';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/async-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_TESTIMONIALS = [
  {
    id: 't-1',
    customer_name: 'Priya Sharma',
    content: 'The vegetables in our Staple Box arrive extraordinarily fresh every Sunday morning! Knowing it comes straight from local farmers makes it even better.',
    rating: 5,
    location: 'Singapore Township, Pocharam',
    verified: true,
    is_demo: true,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-2',
    customer_name: 'Vikram Malhotra',
    content: 'Saves my weekend trip to the crowded mandi. The Staple Box easily lasts our family of 3 through the week. Highly recommended!',
    rating: 5,
    location: 'Modi Emerald Heights, Pocharam',
    verified: true,
    is_demo: true,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 't-3',
    customer_name: 'Ananya Roy',
    content: 'Superb quality tomatoes and palak. The transparent pricing and farmer stories win my heart. Great service for Ghatkesar & Pocharam families.',
    rating: 5,
    location: 'Rajeev Gruha Kalpa, Ghatkesar',
    verified: true,
    is_demo: true,
    active: true,
    created_at: new Date().toISOString(),
  },
];

export default async function HomePage() {
  const [baskets, rawHomeContent] = await Promise.all([
    BasketService.getActiveBaskets(),
    SanityService.getHomePageContent().catch((err) => {
      console.warn('[HomePage] Sanity homePageContent fallback:', err);
      return null;
    }),
  ]);

  const homeContent = rawHomeContent
    ? { ...rawHomeContent, benefitPills: undefined, trustIndicators: undefined }
    : null;

  // Fetch testimonials with 3s max timeout protection (Sanity CMS first, then DB)
  const testimonials = await withTimeout(
    async () => {
      try {
        const sanityTestimonials = await SanityService.getTestimonials();
        if (sanityTestimonials && sanityTestimonials.length > 0) {
          return sanityTestimonials.map((t: any, index: number) => ({
            id: t._id || `sanity-t-${index}`,
            customer_name: t.customerName,
            content: t.content,
            rating: t.rating || 5,
            location: t.location || 'Ghatkesar & Pocharam',
            verified: true,
            is_demo: false,
            active: true,
            created_at: new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[HomePage] Sanity testimonials fallback:', err);
      }

      const supabase = createAdminClient();
      const { data: testimonialsData } = await supabase
        .from('testimonials')
        .select('*')
        .eq('active', true)
        .limit(3);

      return testimonialsData && testimonialsData.length > 0 ? testimonialsData : DEFAULT_TESTIMONIALS;
    },
    3000,
    DEFAULT_TESTIMONIALS
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <Hero initialContent={homeContent} />
        <BasketShowcase baskets={baskets} />
        <HowItWorks
          tagline={homeContent?.howTagline}
          title={homeContent?.howTitle}
          subtitle={homeContent?.howSubtitle}
          steps={homeContent?.howSteps}
        />
        <FarmJourney
          tagline={homeContent?.journeyTagline}
          title={homeContent?.journeyTitle}
          subtitle={homeContent?.journeySubtitle}
          steps={homeContent?.journeySteps}
        />
        <ServiceabilityCheck />
        <Testimonials testimonials={testimonials} />
        <FAQ
          tagline={homeContent?.faqTagline}
          title={homeContent?.faqTitle}
          faqs={homeContent?.faqs}
        />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

