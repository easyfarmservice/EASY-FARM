import { Metadata } from 'next';
import { LegalService } from '@/services/legal.service';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { TERMS_SECTIONS } from '@/lib/legal/legal-content';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Easy Farm',
  description: 'Official Terms & Conditions governing vegetable box purchases, delivery, payments, Easy Coins, and Weekly Streak loyalty for Easy Farm.',
};

export default async function TermsAndConditionsPage() {
  const { document, version } = await LegalService.getPublishedDocument('terms-and-conditions');
  const business = await LegalService.getLegalBusinessDetails();

  return (
    <LegalDocumentLayout
      document={document}
      version={version}
      business={business}
      sections={TERMS_SECTIONS}
      otherDocKey="privacy-policy"
      otherDocTitle="Privacy Policy"
    />
  );
}

