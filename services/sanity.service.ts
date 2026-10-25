import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';

export interface SanityBasket {
  _id: string;
  name: string;
  slug: { current: string };
  description: string;
  price: number;
  compareAtPrice?: number;
  image?: any;
  imageUrl?: string;
  active: boolean;
}

export class SanityService {
  /**
   * Fetch all active baskets from Sanity CMS via GROQ
   */
  static async getActiveBaskets(): Promise<SanityBasket[]> {
    try {
      const query = `*[_type == "basket" && active == true] | order(sortOrder asc) {
        _id,
        name,
        slug,
        description,
        price,
        compareAtPrice,
        image,
        active
      }`;

      const baskets = await client.fetch<SanityBasket[]>(query);
      return (baskets || []).map((b) => ({
        ...b,
        imageUrl: b.image ? urlForImage(b.image)?.url() : undefined,
      }));
    } catch (err) {
      console.warn('[SanityService] GROQ query failed or Sanity dataset empty:', err);
      return [];
    }
  }

  /**
   * Fetch basket by slug from Sanity CMS
   */
  static async getBasketBySlug(slug: string): Promise<SanityBasket | null> {
    try {
      const query = `*[_type == "basket" && slug.current == $slug][0] {
        _id,
        name,
        slug,
        description,
        price,
        compareAtPrice,
        image,
        active
      }`;

      const b = await client.fetch<SanityBasket | null>(query, { slug });
      if (!b) return null;

      return {
        ...b,
        imageUrl: b.image ? urlForImage(b.image)?.url() : undefined,
      };
    } catch (err) {
      console.warn(`[SanityService] getBasketBySlug('${slug}') error:`, err);
      return null;
    }
  }

  /**
   * Fetch active farmers from Sanity CMS
   */
  static async getActiveFarmers(): Promise<any[]> {
    try {
      const query = `*[_type == "farmer" && active == true] {
        _id,
        name,
        village,
        district,
        description,
        photo,
        crops,
        active
      }`;

      const farmers = await client.fetch(query);
      return (farmers || []).map((f: any) => ({
        ...f,
        photoUrl: f.photo ? urlForImage(f.photo)?.url() : undefined,
      }));
    } catch (err) {
      console.warn('[SanityService] getActiveFarmers error:', err);
      return [];
    }
  }

  /**
   * Fetch customer testimonials from Sanity CMS
   */
  static async getTestimonials(): Promise<any[]> {
    try {
      const query = `*[_type == "testimonial" && active == true] {
        _id,
        customerName,
        location,
        content,
        rating
      }`;

      return (await client.fetch(query)) || [];
    } catch (err) {
      console.warn('[SanityService] getTestimonials error:', err);
      return [];
    }
  }

  /**
   * Fetch home page content (singleton) from Sanity CMS
   */
  static async getHomePageContent(): Promise<any | null> {
    try {
      const query = `*[_type == "homePage" && _id == "homePage"][0] {
        heroHeadlinePart1,
        heroHeadlinePart2,
        heroSubtitle,
        heroPrimaryButton,
        heroSecondaryButton,
        heroImageCaption,
        heroImageDescription,
        benefitPills,
        trustIndicators,
        whyTagline,
        whyTitle,
        whySubtitle,
        whyBenefits,
        howTagline,
        howTitle,
        howSubtitle,
        howSteps,
        pipelineTagline,
        pipelineTitle,
        pipelineSubtitle,
        pipelineSteps,
        communityTagline,
        communityTitle,
        communitySubtitle,
        communityButtonText,
        faqTagline,
        faqTitle,
        faqs
      }`;
      return await client.fetch(query);
    } catch (err) {
      console.warn('[SanityService] getHomePageContent error:', err);
      return null;
    }
  }

  /**
   * Fetch site settings & footer (singleton) from Sanity CMS
   */
  static async getSiteSettings(): Promise<any | null> {
    try {
      const query = `*[_type == "siteSettings" && _id == "siteSettings"][0] {
        announcementActive,
        announcementText,
        siteTagline,
        supportEmail,
        supportPhone,
        footerAbout,
        activeZoneText,
        upcomingZones,
        copyrightNotice
      }`;
      return await client.fetch(query);
    } catch (err) {
      console.warn('[SanityService] getSiteSettings error:', err);
      return null;
    }
  }

  /**
   * Fetch How It Works page content (singleton) from Sanity CMS
   */
  static async getHowItWorksPage(): Promise<any | null> {
    try {
      const query = `*[_type == "howItWorksPage" && _id == "howItWorksPage"][0] {
        bannerTitle,
        bannerSubtitle,
        cutoffSectionTitle,
        cutoffPoints,
        ctaButtonText
      }`;
      return await client.fetch(query);
    } catch (err) {
      console.warn('[SanityService] getHowItWorksPage error:', err);
      return null;
    }
  }
}
