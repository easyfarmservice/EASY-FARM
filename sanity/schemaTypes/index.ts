import { type SchemaTypeDefinition } from 'sanity';
import { basketSchema } from './basket';
import { productSchema } from './product';
import { farmerSchema } from './farmer';
import { testimonialSchema } from './testimonial';
import { homePageSchema } from './homePage';
import { siteSettingsSchema } from './siteSettings';
import { howItWorksPageSchema } from './howItWorksPage';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    homePageSchema,
    siteSettingsSchema,
    howItWorksPageSchema,
    basketSchema,
    productSchema,
    farmerSchema,
    testimonialSchema,
  ],
};
