import { defineField, defineType } from 'sanity';

export const farmerSchema = defineType({
  name: 'farmer',
  title: 'Farmer Partner',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Farmer Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'village',
      title: 'Village (e.g. Chevella, Shankarpally)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'district',
      title: 'District',
      type: 'string',
      initialValue: 'Ranga Reddy',
    }),
    defineField({
      name: 'description',
      title: 'Farming Story / Details',
      type: 'text',
    }),
    defineField({
      name: 'photo',
      title: 'Farmer Photo',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'crops',
      title: 'Crops Grown',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'active',
      title: 'Is Active Partner?',
      type: 'boolean',
      initialValue: true,
    }),
  ],
});
