import { defineField, defineType } from 'sanity';

export const howItWorksPageSchema = defineType({
  name: 'howItWorksPage',
  title: 'How It Works Page',
  type: 'document',
  fields: [
    defineField({
      name: 'bannerTitle',
      title: 'Top Banner Headline',
      type: 'string',
      initialValue: 'How Easy Farm Works',
    }),
    defineField({
      name: 'bannerSubtitle',
      title: 'Top Banner Subtitle',
      type: 'string',
      initialValue: 'A zero-warehouse, harvest-to-order weekly supply chain.',
    }),
    defineField({
      name: 'cutoffSectionTitle',
      title: 'Cutoff Explanation Section Title',
      type: 'string',
      initialValue: 'Why the Saturday Cutoff Matters:',
    }),
    defineField({
      name: 'cutoffPoints',
      title: 'Cutoff Reason Points',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'boldTitle', title: 'Bold Heading', type: 'string' }),
            defineField({ name: 'text', title: 'Explanation Text', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'boldTitle', subtitle: 'text' } },
        },
      ],
      initialValue: [
        {
          boldTitle: 'Zero Food Waste:',
          text: 'Farmers pluck only what Ghatkesar & Pocharam families have confirmed.',
        },
        {
          boldTitle: 'Unsurpassed Freshness:',
          text: 'Vegetables do not sit in cold stores for weeks.',
        },
        {
          boldTitle: 'Fair Pricing:',
          text: 'No loss from unsold inventory means lower prices for you and higher earnings for Telangana farmers.',
        },
      ],
    }),
    defineField({
      name: 'ctaButtonText',
      title: 'Bottom CTA Button Text',
      type: 'string',
      initialValue: "Order This Week's Basket",
    }),
  ],
  preview: {
    prepare() {
      return { title: 'How It Works Page Content' };
    },
  },
});
