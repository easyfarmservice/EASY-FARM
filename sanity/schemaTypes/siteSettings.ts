import { defineField, defineType } from 'sanity';

export const siteSettingsSchema = defineType({
  name: 'siteSettings',
  title: 'Site Settings & Footer',
  type: 'document',
  fieldsets: [
    { name: 'announcement', title: 'Top Announcement Banner' },
    { name: 'branding', title: 'Header & Brand Details' },
    { name: 'contact', title: 'Contact & Support' },
    { name: 'footer', title: 'Footer Content' },
  ],
  fields: [
    // ── Top Announcement Banner ────────────────────────────────────
    defineField({
      name: 'announcementActive',
      title: 'Show Top Announcement Bar?',
      type: 'boolean',
      fieldset: 'announcement',
      initialValue: true,
    }),
    defineField({
      name: 'announcementText',
      title: 'Announcement Banner Message',
      type: 'string',
      fieldset: 'announcement',
      initialValue:
        '🌾 Next Harvest Delivery: Sunday morning across Ghatkesar & Pocharam communities. Orders close Saturday 11:00 PM.',
    }),

    // ── Branding & Header ──────────────────────────────────────────
    defineField({
      name: 'siteTagline',
      title: 'Header Subtitle Tagline',
      type: 'string',
      fieldset: 'branding',
      initialValue: 'Telangana Fresh',
    }),

    // ── Contact & Support ──────────────────────────────────────────
    defineField({
      name: 'supportEmail',
      title: 'Customer Support Email',
      type: 'string',
      fieldset: 'contact',
      initialValue: 'support@easyfarm.in',
    }),
    defineField({
      name: 'supportPhone',
      title: 'Support Phone Number',
      type: 'string',
      fieldset: 'contact',
      initialValue: '+91 40 8899 7766',
    }),

    // ── Footer Content ─────────────────────────────────────────────
    defineField({
      name: 'footerAbout',
      title: 'Footer About Paragraph',
      type: 'text',
      rows: 3,
      fieldset: 'footer',
      initialValue:
        'Building a fair, transparent food system for Telangana. Connecting local farmers directly with families in Ghatkesar & Pocharam.',
    }),
    defineField({
      name: 'activeZoneText',
      title: 'Active Zone Label',
      type: 'string',
      fieldset: 'footer',
      initialValue: 'Ghatkesar & Pocharam, Hyderabad (Active)',
    }),
    defineField({
      name: 'upcomingZones',
      title: 'Upcoming Expansion Areas',
      type: 'array',
      fieldset: 'footer',
      of: [{ type: 'string' }],
      initialValue: [
        'Uppal & LB Nagar',
        'Boduppal & Medipally',
        'Peerzadiguda & Narapally',
      ],
    }),
    defineField({
      name: 'copyrightNotice',
      title: 'Copyright Notice',
      type: 'string',
      fieldset: 'footer',
      initialValue: 'Easy Farm Technologies India Pvt Ltd. All rights reserved.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings & Footer' };
    },
  },
});
