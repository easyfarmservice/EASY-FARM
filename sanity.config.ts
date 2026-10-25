import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schema } from './sanity/schemaTypes';
import { apiVersion, dataset, projectId } from './sanity/env';

export default defineConfig({
  basePath: '/studio',
  name: 'easy_farm_studio',
  title: 'Easy Farm Content Studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Easy Farm Content')
          .items([
            // ── Static Page & Site Content Singletons ────────────────
            S.listItem()
              .title('🏠 Home Page')
              .child(
                S.document()
                  .schemaType('homePage')
                  .documentId('homePage')
                  .title('Home Page Content & Sections')
              ),
            S.listItem()
              .title('⚙️ Site Settings & Footer')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
                  .title('Site Settings, Banner & Footer')
              ),
            S.listItem()
              .title('📖 How It Works Page')
              .child(
                S.document()
                  .schemaType('howItWorksPage')
                  .documentId('howItWorksPage')
                  .title('How It Works Page Content')
              ),
            S.divider(),
            // ── Dynamic Operations Collections ───────────────────────
            S.listItem()
              .title('🛒 Weekly Baskets')
              .child(S.documentTypeList('basket').title('Weekly Baskets')),
            S.listItem()
              .title('🥦 Master Products')
              .child(S.documentTypeList('product').title('Master Products')),
            S.listItem()
              .title('👨‍🌾 Farmer Partners')
              .child(S.documentTypeList('farmer').title('Farmer Partners')),
            S.listItem()
              .title('⭐ Customer Reviews')
              .child(S.documentTypeList('testimonial').title('Customer Reviews')),
          ]),
    }),
  ],
});
