export type LegalDocumentKey = 'terms-and-conditions' | 'privacy-policy';

export type LegalDocumentStatus = 'draft' | 'published' | 'archived';

export interface LegalDocument {
  id: string;
  key: LegalDocumentKey;
  title: string;
  slug: string;
  current_version: string;
  status: LegalDocumentStatus;
  effective_date: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentVersion {
  id: string;
  document_id: string;
  version: string;
  title: string;
  content: string;
  summary_of_changes?: string | null;
  requires_reacceptance: boolean;
  status: LegalDocumentStatus;
  effective_date: string;
  published_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface LegalAcceptanceRecord {
  id: string;
  customer_id: string;
  profile_id?: string | null;
  document_id: string;
  document_key: LegalDocumentKey;
  version: string;
  accepted_at: string;
  acceptance_source: 'website' | 'mobile_app';
  event_type: 'registration' | 'reacceptance' | 'login_update';
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LegalAuditLog {
  id: string;
  admin_id?: string | null;
  admin_email?: string | null;
  document_id: string;
  action: 'create_draft' | 'update_draft' | 'publish_version' | 'archive_version';
  previous_version?: string | null;
  new_version?: string | null;
  details?: Record<string, any>;
  created_at: string;
}

export interface LegalBusinessDetails {
  businessName: string;
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  registeredAddress: string;
  grievanceOfficerName: string;
  grievanceOfficerEmail: string;
  fssaiLicense: string;
  gstin: string;
  deliveryPromise: string;
  launchCorridor: string;
}

export interface LegalAcceptanceStats {
  totalAcceptances: number;
  uniqueCustomers: number;
  termsAcceptances: number;
  privacyAcceptances: number;
  acceptancesByVersion: Record<string, number>;
  acceptancesBySource: {
    website: number;
    mobile_app: number;
  };
  recentAcceptances: Array<{
    id: string;
    customer_name: string;
    customer_email: string;
    document_key: string;
    version: string;
    accepted_at: string;
    acceptance_source: string;
    event_type: string;
  }>;
}

