import { defineField, defineType } from 'sanity';

export const basketSchema = defineType({
  name: 'basket',
  title: 'Weekly Basket',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Basket Name',
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Selling Price (₹)',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'compareAtPrice',
      title: 'Compare At Price (Original Price ₹)',
      type: 'number',
    }),
    defineField({
      name: 'image',
      title: 'Basket Cover Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'active',
      title: 'Is Active?',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 1,
    }),
    defineField({
      name: 'capacity',
      title: 'Weekly Capacity Limit',
      type: 'number',
      initialValue: 100,
    }),
  ],
});
