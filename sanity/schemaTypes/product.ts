import { defineField, defineType } from 'sanity';

export const productSchema = defineType({
  name: 'product',
  title: 'Master Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Staples', value: 'staples' },
          { title: 'Leafy Greens', value: 'leafy-greens' },
          { title: 'Gourmet & Exotic', value: 'gourmet-exotic' },
        ],
      },
    }),
    defineField({
      name: 'unit',
      title: 'Unit (e.g. kg, bunch, pcs)',
      type: 'string',
      initialValue: 'kg',
    }),
    defineField({
      name: 'price',
      title: 'Base Cost Price (₹)',
      type: 'number',
    }),
    defineField({
      name: 'image',
      title: 'Product Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'active',
      title: 'Active Status',
      type: 'boolean',
      initialValue: true,
    }),
  ],
});
