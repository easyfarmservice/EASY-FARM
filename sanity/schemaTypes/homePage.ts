import { defineField, defineType } from 'sanity';

export const homePageSchema = defineType({
  name: 'homePage',
  title: 'Home Page Content',
  type: 'document',
  fieldsets: [
    { name: 'hero', title: '1. Hero Section' },
    { name: 'trust', title: '2. Trust Indicators' },
    { name: 'why', title: '3. Why Choose Easy Farm' },
    { name: 'how', title: '4. How It Works Section' },
    { name: 'journey', title: '5. 36-Hour Farm Journey Pipeline' },
    { name: 'community', title: '6. Community & Apartment Delivery' },
    { name: 'faq', title: '7. Frequently Asked Questions' },
  ],
  fields: [
    // ── 1. Hero Section ────────────────────────────────────────────
    defineField({
      name: 'heroHeadlinePart1',
      title: 'Hero Headline — Part 1 (plain text)',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Fresh from Telangana Farms.',
    }),
    defineField({
      name: 'heroHeadlinePart2',
      title: 'Hero Headline — Part 2 (highlighted green text)',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Delivered to Your Door Every Sunday.',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Subtitle',
      type: 'text',
      rows: 3,
      fieldset: 'hero',
      initialValue:
        'Seasonal vegetables plucked straight from local Telangana farmers in Chevella & Vikarabad on Saturday, delivered to your doorstep in Ghatkesar by Sunday afternoon. Zero cold storage, guaranteed fresh.',
    }),
    defineField({
      name: 'heroPrimaryButton',
      title: 'Primary Button Text',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Check Delivery Availability',
    }),
    defineField({
      name: 'heroSecondaryButton',
      title: 'Secondary Button Text',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Explore Weekly Baskets',
    }),
    defineField({
      name: 'heroImageCaption',
      title: 'Hero Image Overlay Caption',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Weekly Telangana Harvest',
    }),
    defineField({
      name: 'heroImageDescription',
      title: 'Hero Image Overlay Description',
      type: 'string',
      fieldset: 'hero',
      initialValue: 'Country Tomatoes, Purple Brinjals, Fresh Palak, Organic Carrots & Beans',
    }),
    defineField({
      name: 'benefitPills',
      title: 'Benefit Pills (4 boxes below headline)',
      type: 'array',
      fieldset: 'hero',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'subtitle' },
          },
        },
      ],
      initialValue: [
        { title: 'Freshly Harvested', subtitle: 'Saturday Pluck' },
        { title: 'Farmer Direct', subtitle: '+15% Fair Pay' },
        { title: 'Sunday Delivery', subtitle: 'Guaranteed Fresh' },
        { title: 'Transparent Price', subtitle: 'Zero Middlemen' },
      ],
    }),

    // ── 2. Trust Indicators ────────────────────────────────────────
    defineField({
      name: 'trustIndicators',
      title: 'Trust Indicator Badges',
      type: 'array',
      fieldset: 'trust',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        },
      ],
      initialValue: [
        {
          title: '100% Local Telangana Produce',
          description: 'Harvested directly from partner farms in Chevella, Shankarpally & Medak.',
        },
        {
          title: 'Farmer-First Transparent Pricing',
          description: 'Eliminating middleman margins so farmers earn fair, sustainable payouts.',
        },
        {
          title: 'Zero Cold Storage Processing',
          description: 'Picked Saturday morning, packed fresh, and delivered to your home by Sunday.',
        },
        {
          title: 'Guaranteed Sunday Morning Delivery',
          description: 'Scheduled weekly deliveries directly to gated communities & homes in Ghatkesar.',
        },
      ],
    }),

    // ── 3. Why Choose Easy Farm ────────────────────────────────────
    defineField({
      name: 'whyTagline',
      title: 'Section Tagline Badge',
      type: 'string',
      fieldset: 'why',
      initialValue: 'Why Choose Easy Farm',
    }),
    defineField({
      name: 'whyTitle',
      title: 'Section Headline',
      type: 'string',
      fieldset: 'why',
      initialValue: 'Better for You. Fairer for Farmers.',
    }),
    defineField({
      name: 'whySubtitle',
      title: 'Section Subtitle',
      type: 'text',
      rows: 2,
      fieldset: 'why',
      initialValue:
        'We are building a transparent, direct supply chain that brings fresh regional produce straight from soil to kitchen.',
    }),
    defineField({
      name: 'whyBenefits',
      title: 'Benefit Cards',
      type: 'array',
      fieldset: 'why',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        },
      ],
      initialValue: [
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
      ],
    }),

    // ── 4. How It Works Section ────────────────────────────────────
    defineField({
      name: 'howTagline',
      title: 'How It Works Tagline',
      type: 'string',
      fieldset: 'how',
      initialValue: 'Simple Weekly Routine',
    }),
    defineField({
      name: 'howTitle',
      title: 'How It Works Title',
      type: 'string',
      fieldset: 'how',
      initialValue: 'How Easy Farm Works',
    }),
    defineField({
      name: 'howSubtitle',
      title: 'How It Works Subtitle',
      type: 'text',
      rows: 2,
      fieldset: 'how',
      initialValue:
        'Eliminating middleman markups and food waste through our harvest-to-order weekly supply chain.',
    }),
    defineField({
      name: 'howSteps',
      title: 'Weekly Routine Steps (3 Steps)',
      type: 'array',
      fieldset: 'how',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'step', title: 'Step Number (e.g. 01)', type: 'string' }),
            defineField({ name: 'title', title: 'Step Title', type: 'string' }),
            defineField({ name: 'description', title: 'Step Description', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'title', subtitle: 'description' } },
        },
      ],
      initialValue: [
        {
          step: '01',
          title: 'Order by Saturday 11:00 PM',
          description:
            'Choose your preferred weekly vegetable basket before Saturday 11:00 PM so our partner farmers can plan harvesting.',
        },
        {
          step: '02',
          title: 'Harvested Fresh on Saturday',
          description:
            'Local Telangana farmers pluck vegetables on Saturday morning based on confirmed orders. Zero cold storage or warehouses.',
        },
        {
          step: '03',
          title: 'Delivered Sunday by 6 PM',
          description:
            'Produce is quality checked, sorted, packed into eco-baskets, and delivered straight to your door every Sunday.',
        },
      ],
    }),

    // ── 5. 36-Hour Farm Journey Pipeline ───────────────────────────
    defineField({
      name: 'pipelineTagline',
      title: 'Pipeline Tagline Badge',
      type: 'string',
      fieldset: 'journey',
      initialValue: 'From Soil to Sunday Table',
    }),
    defineField({
      name: 'pipelineTitle',
      title: 'Pipeline Headline',
      type: 'string',
      fieldset: 'journey',
      initialValue: 'The 36-Hour Freshness Pipeline',
    }),
    defineField({
      name: 'pipelineSubtitle',
      title: 'Pipeline Subtitle',
      type: 'text',
      rows: 2,
      fieldset: 'journey',
      initialValue:
        'Follow the journey of your vegetables from regional farms to your Ghatkesar home.',
    }),
    defineField({
      name: 'pipelineSteps',
      title: 'Pipeline Journey Milestones',
      type: 'array',
      fieldset: 'journey',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Milestone Label', type: 'string' }),
            defineField({ name: 'desc', title: 'Short Description', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'desc' } },
        },
      ],
      initialValue: [
        { label: '1. Local Farmer', desc: 'Partnered smallholders in Telangana' },
        { label: '2. Fresh Harvest', desc: 'Plucked Saturday morning' },
        { label: '3. Quality Check', desc: 'Sorted & graded for purity' },
        { label: '4. Eco Packing', desc: 'Zero-plastic ventilated boxes' },
        { label: '5. Easy Farm Logistics', desc: 'Temperature-managed dispatch' },
        { label: '6. Doorstep Drop', desc: 'Fresh on your Sunday table' },
      ],
    }),

    // ── 6. Community & Apartment Delivery ──────────────────────────
    defineField({
      name: 'communityTagline',
      title: 'Community Badge Tagline',
      type: 'string',
      fieldset: 'community',
      initialValue: 'Gated Communities & Apartments',
    }),
    defineField({
      name: 'communityTitle',
      title: 'Community Headline',
      type: 'string',
      fieldset: 'community',
      initialValue: 'Bring Easy Farm to Your Community',
    }),
    defineField({
      name: 'communitySubtitle',
      title: 'Community Subtitle',
      type: 'text',
      rows: 2,
      fieldset: 'community',
      initialValue:
        'If your gated community or apartment has multiple families interested in fresh Telangana farm produce, we can coordinate weekly Sunday deliveries together.',
    }),
    defineField({
      name: 'communityButtonText',
      title: 'Community CTA Button Text',
      type: 'string',
      fieldset: 'community',
      initialValue: 'Request Community Delivery →',
    }),

    // ── 7. Frequently Asked Questions ──────────────────────────────
    defineField({
      name: 'faqTagline',
      title: 'FAQ Tagline Badge',
      type: 'string',
      fieldset: 'faq',
      initialValue: 'Got Questions?',
    }),
    defineField({
      name: 'faqTitle',
      title: 'FAQ Headline',
      type: 'string',
      fieldset: 'faq',
      initialValue: 'Frequently Asked Questions',
    }),
    defineField({
      name: 'faqs',
      title: 'FAQ List',
      type: 'array',
      fieldset: 'faq',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'q', title: 'Question', type: 'string' }),
            defineField({ name: 'a', title: 'Answer', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'q', subtitle: 'a' } },
        },
      ],
      initialValue: [
        {
          q: 'Where do you deliver?',
          a: 'Easy Farm currently delivers to selected gated communities in Ghatkesar & Pocharam, Hyderabad — including Singapore Township, Sanskruti Township, Rajeev Gruha Kalpa, Modi Emerald Heights, and surrounding residences.',
        },
        {
          q: 'When do weekly orders close?',
          a: 'Weekly orders close every Saturday at 11:00 PM. This gives our partner Telangana farmers clear visibility to prepare fresh Sunday morning harvests according to exact demand.',
        },
        {
          q: 'When are vegetables harvested and delivered?',
          a: 'Vegetables are harvested fresh from Telangana farms, quality checked, sorted, packed, and delivered straight to your door every Sunday by 6 PM.',
        },
        {
          q: 'How are farmers paid?',
          a: 'We operate on a transparent direct-to-farmer model. We pay our partner farmers 15% above the prevailing mandi benchmark for eligible produce, eliminating middleman cuts.',
        },
        {
          q: 'Can I change my address or cancel my order?',
          a: 'Yes, you can edit your address or cancel your order anytime before Saturday 11:00 PM directly from your customer account page.',
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Page Content' };
    },
  },
});
