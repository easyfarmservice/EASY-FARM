import { Metadata } from 'next';
import { LegalService } from '@/services/legal.service';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { PRIVACY_SECTIONS } from '@/lib/legal/legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy | Easy Farm',
  description: 'Official Privacy Policy detailing how Easy Farm collects, safeguards, and processes customer information in compliance with Indian privacy laws.',
};

export default async function PrivacyPolicyPage() {
  const { document, version } = await LegalService.getPublishedDocument('privacy-policy');
  const business = await LegalService.getLegalBusinessDetails();

  return (
    <LegalDocumentLayout
      document={document}
      version={version}
      business={business}
      sections={PRIVACY_SECTIONS}
      otherDocKey="terms-and-conditions"
      otherDocTitle="Terms & Conditions"
    />
  );
}

