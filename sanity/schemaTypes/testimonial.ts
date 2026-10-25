import { defineField, defineType } from 'sanity';

export const testimonialSchema = defineType({
  name: 'testimonial',
  title: 'Customer Review',
  type: 'document',
  fields: [
    defineField({
      name: 'customerName',
      title: 'Customer Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Ghatkesar Community (e.g. Singapore Township / Emerald Heights)',
      type: 'string',
    }),
    defineField({
      name: 'content',
      title: 'Review Text',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Star Rating (1-5)',
      type: 'number',
      initialValue: 5,
    }),
    defineField({
      name: 'active',
      title: 'Display on Site?',
      type: 'boolean',
      initialValue: true,
    }),
  ],
});
