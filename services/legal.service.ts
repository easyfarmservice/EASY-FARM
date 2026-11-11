import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  LegalDocument,
  LegalDocumentVersion,
  LegalAcceptanceRecord,
  LegalAuditLog,
  LegalBusinessDetails,
  LegalAcceptanceStats,
  LegalDocumentKey,
} from '@/types/legal';
import {
  DEFAULT_TERMS_AND_CONDITIONS,
  DEFAULT_PRIVACY_POLICY,
} from '@/lib/legal/legal-content';

const DATA_FILE_PATH = path.join(process.cwd(), 'lib', 'data', 'legal-data.json');

// Default in-memory & file storage for zero-downtime resilience
function readFallbackData(): any {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[LegalService] Could not read fallback file:', err);
  }

  const initialDocs: Record<string, LegalDocument> = {
    'terms-and-conditions': {
      id: '11111111-1111-1111-1111-111111111111',
      key: 'terms-and-conditions',
      title: 'Terms & Conditions',
      slug: 'terms-and-conditions',
      current_version: '1.0',
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
      updated_at: '2026-11-11T00:00:00.000Z',
    },
    'privacy-policy': {
      id: '22222222-2222-2222-2222-222222222222',
      key: 'privacy-policy',
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      current_version: '1.0',
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
      updated_at: '2026-11-11T00:00:00.000Z',
    },
  };

  const initialVersions: LegalDocumentVersion[] = [
    {
      id: 'v1-terms',
      document_id: '11111111-1111-1111-1111-111111111111',
      version: '1.0',
      title: 'Terms & Conditions',
      content: DEFAULT_TERMS_AND_CONDITIONS.trim(),
      summary_of_changes: 'Initial comprehensive publication covering all 16 operating sections.',
      requires_reacceptance: false,
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
    },
    {
      id: 'v1-privacy',
      document_id: '22222222-2222-2222-2222-222222222222',
      version: '1.0',
      title: 'Privacy Policy',
      content: DEFAULT_PRIVACY_POLICY.trim(),
      summary_of_changes: 'Initial comprehensive publication covering all 15 privacy sections.',
      requires_reacceptance: false,
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
    },
  ];

  return {
    documents: initialDocs,
    versions: initialVersions,
    acceptances: [],
    auditLogs: [],
    businessDetails: {
      businessName: 'Easy Farm Fresh Produce',
      brandName: 'Easy Farm',
      supportEmail: 'easyfarmsupport@gmail.com',
      supportPhone: '+91 40 8899 7766',
      whatsappNumber: '+91 98490 12345',
      registeredAddress: 'Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088',
      grievanceOfficerName: 'Grievance Redressal Officer',
      grievanceOfficerEmail: 'grievance@easyfarm.co.in',
      fssaiLicense: '',
      gstin: '',
      deliveryPromise: 'Sunday by 6 PM',
      launchCorridor: 'Ghatkesar & Pocharam, Hyderabad (Active)',
    },
  };
}

function writeFallbackData(data: any) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[LegalService] Could not write fallback file:', err);
  }
}

export class LegalService {
  /**
   * Check if a document content has unconfigured placeholders
   */
  static hasUnresolvedPlaceholders(content: string): { hasPlaceholders: boolean; placeholders: string[] } {
    const regex = /\[(?:PENDING|TODO|PLACEHOLDER|INSERT)_[A-Z0-9_]+\]/g;
    const matches = content.match(regex) || [];
    return {
      hasPlaceholders: matches.length > 0,
      placeholders: Array.from(new Set(matches)),
    };
  }

  /**
   * Get published document and its active version content
   */
  static async getPublishedDocument(key: LegalDocumentKey): Promise<{
    document: LegalDocument;
    version: LegalDocumentVersion;
  }> {
    try {
      const supabase = createAdminClient();

      // Fetch document row
      const { data: docData, error: docError } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('key', key)
        .eq('status', 'published')
        .maybeSingle();

      if (docData && !docError) {
        // Fetch current version row
        const { data: verData, error: verError } = await supabase
          .from('legal_document_versions')
          .select('*')
          .eq('document_id', docData.id)
          .eq('version', docData.current_version)
          .eq('status', 'published')
          .maybeSingle();

        if (verData && !verError) {
          return {
            document: docData as LegalDocument,
            version: verData as LegalDocumentVersion,
          };
        }
      }
    } catch (err) {
      console.warn('[LegalService] Supabase fetch error, using resilient fallback:', err);
    }

    // Fallback to local storage
    const fallback = readFallbackData();
    const doc = fallback.documents[key] || {
      id: key === 'terms-and-conditions' ? '11111111-1111-1111-1111-111111111111' : '22222222-2222-2222-2222-222222222222',
      key,
      title: key === 'terms-and-conditions' ? 'Terms & Conditions' : 'Privacy Policy',
      slug: key,
      current_version: '1.0',
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
      updated_at: '2026-11-11T00:00:00.000Z',
    };

    const ver = fallback.versions.find(
      (v: LegalDocumentVersion) => v.document_id === doc.id && v.version === doc.current_version && v.status === 'published'
    ) || {
      id: `v1-${key}`,
      document_id: doc.id,
      version: '1.0',
      title: doc.title,
      content: key === 'terms-and-conditions' ? DEFAULT_TERMS_AND_CONDITIONS.trim() : DEFAULT_PRIVACY_POLICY.trim(),
      summary_of_changes: 'Initial publication',
      requires_reacceptance: false,
      status: 'published',
      effective_date: '2026-11-11T00:00:00.000Z',
      published_at: '2026-11-11T00:00:00.000Z',
      created_at: '2026-11-11T00:00:00.000Z',
    };

    return { document: doc, version: ver };
  }

  /**
   * Get all registered legal documents (Terms and Privacy)
   */
  static async getAllDocuments(): Promise<LegalDocument[]> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .order('title', { ascending: true });

      if (data && data.length > 0 && !error) {
        return data as LegalDocument[];
      }
    } catch (e) {
      console.warn('[LegalService.getAllDocuments] Using fallback:', e);
    }

    const fallback = readFallbackData();
    return Object.values(fallback.documents);
  }

  /**
   * Get all versions for a document (drafts and published)
   */
  static async getAllVersions(documentId: string): Promise<LegalDocumentVersion[]> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('legal_document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        return data as LegalDocumentVersion[];
      }
    } catch (e) {
      console.warn('[LegalService.getAllVersions] Using fallback:', e);
    }

    const fallback = readFallbackData();
    return fallback.versions
      .filter((v: LegalDocumentVersion) => v.document_id === documentId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Create or update a draft version
   */
  static async saveDraftVersion(params: {
    documentId: string;
    version: string;
    title: string;
    content: string;
    summaryOfChanges?: string;
    requiresReacceptance?: boolean;
    adminId?: string;
    adminEmail?: string;
  }): Promise<LegalDocumentVersion> {
    const {
      documentId,
      version,
      title,
      content,
      summaryOfChanges = '',
      requiresReacceptance = false,
      adminId,
      adminEmail,
    } = params;

    const record: Partial<LegalDocumentVersion> = {
      document_id: documentId,
      version: version.trim(),
      title: title.trim(),
      content: content.trim(),
      summary_of_changes: summaryOfChanges,
      requires_reacceptance: Boolean(requiresReacceptance),
      status: 'draft',
      effective_date: new Date().toISOString(),
      created_by: adminId || null,
    };

    try {
      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from('legal_document_versions')
        .select('id')
        .eq('document_id', documentId)
        .eq('version', version.trim())
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('legal_document_versions')
          .update({
            title: record.title,
            content: record.content,
            summary_of_changes: record.summary_of_changes,
            requires_reacceptance: record.requires_reacceptance,
            status: 'draft',
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          await this.logAuditAction({
            adminId,
            adminEmail,
            documentId,
            action: 'update_draft',
            newVersion: version,
            details: { summary: summaryOfChanges },
          });
          return data as LegalDocumentVersion;
        }
      } else {
        const { data, error } = await supabase
          .from('legal_document_versions')
          .insert(record)
          .select()
          .single();

        if (!error && data) {
          await this.logAuditAction({
            adminId,
            adminEmail,
            documentId,
            action: 'create_draft',
            newVersion: version,
            details: { summary: summaryOfChanges },
          });
          return data as LegalDocumentVersion;
        }
      }
    } catch (e) {
      console.warn('[LegalService.saveDraftVersion] Supabase failed, saving to fallback:', e);
    }

    // Fallback file persistence
    const fallback = readFallbackData();
    const existingIdx = fallback.versions.findIndex(
      (v: LegalDocumentVersion) => v.document_id === documentId && v.version === version.trim()
    );

    const fullRecord: LegalDocumentVersion = {
      id: existingIdx >= 0 ? fallback.versions[existingIdx].id : `ver-${Date.now()}`,
      document_id: documentId,
      version: version.trim(),
      title: title.trim(),
      content: content.trim(),
      summary_of_changes: summaryOfChanges,
      requires_reacceptance: Boolean(requiresReacceptance),
      status: 'draft',
      effective_date: new Date().toISOString(),
      created_by: adminId || null,
      created_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      fallback.versions[existingIdx] = fullRecord;
    } else {
      fallback.versions.push(fullRecord);
    }

    writeFallbackData(fallback);
    return fullRecord;
  }

  /**
   * Publish a draft version
   * - Validates that no unresolved placeholders exist
   * - Marks draft as published
   * - Updates legal_documents.current_version and published_at
   * - Preserves previous versions as archived
   */
  static async publishVersion(params: {
    documentId: string;
    version: string;
    effectiveDate?: string;
    summaryOfChanges?: string;
    requiresReacceptance?: boolean;
    adminId?: string;
    adminEmail?: string;
  }): Promise<{ success: boolean; message: string; version?: LegalDocumentVersion }> {
    const { documentId, version, effectiveDate, summaryOfChanges, requiresReacceptance, adminId, adminEmail } = params;

    const allVersions = await this.getAllVersions(documentId);
    const target = allVersions.find((v) => v.version === version);

    if (!target) {
      return { success: false, message: `Version ${version} does not exist.` };
    }

    // Verify unresolved placeholders
    const placeholderCheck = this.hasUnresolvedPlaceholders(target.content);
    if (placeholderCheck.hasPlaceholders) {
      return {
        success: false,
        message: `Cannot publish document with unresolved legal placeholders: ${placeholderCheck.placeholders.join(', ')}. Please edit and resolve them before publishing.`,
      };
    }

    const now = new Date().toISOString();
    const effDate = effectiveDate || now;

    try {
      const supabase = createAdminClient();

      // 1. Fetch current document details for previous version audit
      const { data: docData } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      const previousVersion = docData?.current_version || null;

      // 2. Archive previous published versions
      await supabase
        .from('legal_document_versions')
        .update({ status: 'archived' })
        .eq('document_id', documentId)
        .eq('status', 'published');

      // 3. Update target version to published
      const { data: updatedVersion, error: verErr } = await supabase
        .from('legal_document_versions')
        .update({
          status: 'published',
          effective_date: effDate,
          published_at: now,
          summary_of_changes: summaryOfChanges || target.summary_of_changes,
          requires_reacceptance: typeof requiresReacceptance === 'boolean' ? requiresReacceptance : target.requires_reacceptance,
        })
        .eq('document_id', documentId)
        .eq('version', version)
        .select()
        .single();

      if (verErr) throw verErr;

      // 4. Update parent document current_version
      await supabase
        .from('legal_documents')
        .update({
          current_version: version,
          status: 'published',
          effective_date: effDate,
          published_at: now,
          updated_at: now,
        })
        .eq('id', documentId);

      // 5. Audit log
      await this.logAuditAction({
        adminId,
        adminEmail,
        documentId,
        action: 'publish_version',
        previousVersion,
        newVersion: version,
        details: { effectiveDate: effDate, requiresReacceptance },
      });

      return {
        success: true,
        message: `Version ${version} published successfully!`,
        version: updatedVersion as LegalDocumentVersion,
      };
    } catch (e: any) {
      console.warn('[LegalService.publishVersion] Supabase error, updating fallback:', e);

      const fallback = readFallbackData();
      const doc = Object.values(fallback.documents).find((d: any) => d.id === documentId) as LegalDocument;
      const previousVersion = doc ? doc.current_version : null;

      fallback.versions.forEach((v: LegalDocumentVersion) => {
        if (v.document_id === documentId && v.status === 'published') {
          v.status = 'archived';
        }
        if (v.document_id === documentId && v.version === version) {
          v.status = 'published';
          v.effective_date = effDate;
          v.published_at = now;
          if (summaryOfChanges) v.summary_of_changes = summaryOfChanges;
          if (typeof requiresReacceptance === 'boolean') v.requires_reacceptance = requiresReacceptance;
        }
      });

      if (doc) {
        doc.current_version = version;
        doc.status = 'published';
        doc.effective_date = effDate;
        doc.published_at = now;
        doc.updated_at = now;
      }

      writeFallbackData(fallback);

      return {
        success: true,
        message: `Version ${version} published successfully!`,
        version: target,
      };
    }
  }

  /**
   * Record customer explicit legal acceptance during registration or re-acceptance
   */
  static async recordAcceptance(params: {
    customerId: string;
    profileId?: string;
    acceptanceSource?: 'website' | 'mobile_app';
    eventType?: 'registration' | 'reacceptance' | 'login_update';
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; records: LegalAcceptanceRecord[] }> {
    const {
      customerId,
      profileId,
      acceptanceSource = 'website',
      eventType = 'registration',
      ipAddress,
      userAgent,
      metadata = {},
    } = params;

    // Fetch active published versions of both Terms and Privacy
    const terms = await this.getPublishedDocument('terms-and-conditions');
    const privacy = await this.getPublishedDocument('privacy-policy');

    const docsToAccept = [
      { doc: terms.document, ver: terms.version, key: 'terms-and-conditions' as LegalDocumentKey },
      { doc: privacy.document, ver: privacy.version, key: 'privacy-policy' as LegalDocumentKey },
    ];

    const createdRecords: LegalAcceptanceRecord[] = [];
    const now = new Date().toISOString();

    for (const item of docsToAccept) {
      const record: Partial<LegalAcceptanceRecord> = {
        customer_id: customerId,
        profile_id: profileId || null,
        document_id: item.doc.id,
        document_key: item.key,
        version: item.ver.version,
        accepted_at: now,
        acceptance_source: acceptanceSource,
        event_type: eventType,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: {
          ...metadata,
          document_title: item.doc.title,
          effective_date: item.ver.effective_date,
        },
      };

      try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from('legal_acceptance_records')
          .upsert(record, { onConflict: 'customer_id,document_id,version' })
          .select()
          .single();

        if (!error && data) {
          createdRecords.push(data as LegalAcceptanceRecord);
          continue;
        }
      } catch (err) {
        console.warn('[LegalService.recordAcceptance] Supabase upsert error, falling back:', err);
      }

      // Fallback in-memory/file
      const fallback = readFallbackData();
      const existing = fallback.acceptances.find(
        (a: LegalAcceptanceRecord) =>
          a.customer_id === customerId && a.document_id === item.doc.id && a.version === item.ver.version
      );

      const fullRecord: LegalAcceptanceRecord = {
        id: existing?.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customer_id: customerId,
        profile_id: profileId || null,
        document_id: item.doc.id,
        document_key: item.key,
        version: item.ver.version,
        accepted_at: now,
        acceptance_source: acceptanceSource,
        event_type: eventType,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata,
        created_at: now,
      };

      if (!existing) {
        fallback.acceptances.push(fullRecord);
        writeFallbackData(fallback);
      }
      createdRecords.push(fullRecord);
    }

    return { success: true, records: createdRecords };
  }

  /**
   * Check if an authenticated customer has accepted the latest required policy versions
   */
  static async checkCustomerAcceptanceStatus(customerId: string): Promise<{
    requiresReacceptance: boolean;
    pendingDocuments: Array<{
      key: LegalDocumentKey;
      title: string;
      currentVersion: string;
      summaryOfChanges?: string;
    }>;
  }> {
    if (!customerId) {
      return { requiresReacceptance: false, pendingDocuments: [] };
    }

    const terms = await this.getPublishedDocument('terms-and-conditions');
    const privacy = await this.getPublishedDocument('privacy-policy');

    const publishedDocs = [terms, privacy];
    const pendingDocuments: any[] = [];

    let customerAcceptances: LegalAcceptanceRecord[] = [];

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('legal_acceptance_records')
        .select('*')
        .eq('customer_id', customerId);

      if (!error && data) {
        customerAcceptances = data as LegalAcceptanceRecord[];
      }
    } catch {
      const fallback = readFallbackData();
      customerAcceptances = fallback.acceptances.filter((a: any) => a.customer_id === customerId);
    }

    for (const item of publishedDocs) {
      const hasAccepted = customerAcceptances.some(
        (a) => a.document_id === item.document.id && a.version === item.version.version
      );

      // If customer hasn't accepted this version and version demands reacceptance (or user has no acceptances at all):
      if (!hasAccepted && item.version.requires_reacceptance) {
        pendingDocuments.push({
          key: item.document.key,
          title: item.document.title,
          currentVersion: item.version.version,
          summaryOfChanges: item.version.summary_of_changes,
        });
      }
    }

    return {
      requiresReacceptance: pendingDocuments.length > 0,
      pendingDocuments,
    };
  }

  /**
   * Get acceptance statistics for Admin dashboard
   */
  static async getAcceptanceStats(): Promise<LegalAcceptanceStats> {
    let acceptances: LegalAcceptanceRecord[] = [];

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('legal_acceptance_records')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .order('accepted_at', { ascending: false });

      if (!error && data) {
        acceptances = data as any[];
      }
    } catch {
      const fallback = readFallbackData();
      acceptances = fallback.acceptances;
    }

    const uniqueCustomers = new Set(acceptances.map((a) => a.customer_id)).size;
    const termsAcceptances = acceptances.filter((a) => a.document_key === 'terms-and-conditions').length;
    const privacyAcceptances = acceptances.filter((a) => a.document_key === 'privacy-policy').length;

    const acceptancesByVersion: Record<string, number> = {};
    const acceptancesBySource = { website: 0, mobile_app: 0 };

    acceptances.forEach((a) => {
      const verKey = `${a.document_key} v${a.version}`;
      acceptancesByVersion[verKey] = (acceptancesByVersion[verKey] || 0) + 1;
      if (a.acceptance_source === 'mobile_app') {
        acceptancesBySource.mobile_app += 1;
      } else {
        acceptancesBySource.website += 1;
      }
    });

    const recentAcceptances = acceptances.slice(0, 25).map((a: any) => ({
      id: a.id,
      customer_name: a.profiles?.full_name || a.metadata?.fullName || 'Registered Resident',
      customer_email: a.profiles?.email || a.metadata?.email || 'customer@easyfarm.in',
      document_key: a.document_key,
      version: a.version,
      accepted_at: a.accepted_at,
      acceptance_source: a.acceptance_source,
      event_type: a.event_type,
    }));

    return {
      totalAcceptances: acceptances.length,
      uniqueCustomers,
      termsAcceptances,
      privacyAcceptances,
      acceptancesByVersion,
      acceptancesBySource,
      recentAcceptances,
    };
  }

  /**
   * Generate CSV format for legal compliance export
   */
  static async exportAcceptanceRecordsCsv(): Promise<string> {
    const stats = await this.getAcceptanceStats();
    let acceptances: any[] = [];

    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('legal_acceptance_records')
        .select('*, profiles(full_name, email)')
        .order('accepted_at', { ascending: false });

      if (data) acceptances = data;
    } catch {
      const fallback = readFallbackData();
      acceptances = fallback.acceptances;
    }

    const headers = [
      'Record ID',
      'Customer ID',
      'Customer Name',
      'Customer Email',
      'Document Key',
      'Document Version',
      'Accepted At (UTC)',
      'Acceptance Source',
      'Event Type',
      'IP Address',
      'User Agent',
    ];

    const rows = acceptances.map((a: any) => [
      `"${a.id}"`,
      `"${a.customer_id}"`,
      `"${(a.profiles?.full_name || a.metadata?.fullName || 'Customer').replace(/"/g, '""')}"`,
      `"${(a.profiles?.email || a.metadata?.email || '').replace(/"/g, '""')}"`,
      `"${a.document_key}"`,
      `"${a.version}"`,
      `"${a.accepted_at}"`,
      `"${a.acceptance_source}"`,
      `"${a.event_type}"`,
      `"${a.ip_address || ''}"`,
      `"${(a.user_agent || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Read verified legal business details
   */
  static async getLegalBusinessDetails(): Promise<LegalBusinessDetails> {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('business_settings')
        .select('key, value');

      if (data && data.length > 0) {
        const map: Record<string, any> = {};
        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string' && (val.startsWith('"') || val.startsWith('{') || val.startsWith('['))) {
            try {
              val = JSON.parse(val);
            } catch {}
          }
          map[row.key] = val;
        });

        return {
          businessName: map['legal_business_name'] || 'Easy Farm Fresh Produce',
          brandName: map['legal_brand_name'] || 'Easy Farm',
          supportEmail: map['legal_support_email'] || map['support_email'] || 'easyfarmsupport@gmail.com',
          supportPhone: map['legal_support_phone'] || map['support_phone'] || '+91 40 8899 7766',
          whatsappNumber: map['legal_whatsapp'] || '+91 98490 12345',
          registeredAddress:
            map['legal_registered_address'] ||
            'Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088',
          grievanceOfficerName: map['legal_grievance_officer_name'] || 'Grievance Redressal Officer',
          grievanceOfficerEmail: map['legal_grievance_officer_email'] || 'grievance@easyfarm.co.in',
          fssaiLicense: map['legal_fssai_license'] || '',
          gstin: map['legal_gstin'] || '',
          deliveryPromise: map['delivery_promise'] || 'Sunday by 6 PM',
          launchCorridor: 'Ghatkesar & Pocharam, Hyderabad (Active)',
        };
      }
    } catch (e) {
      console.warn('[LegalService.getLegalBusinessDetails] Using fallback:', e);
    }

    const fallback = readFallbackData();
    return fallback.businessDetails;
  }

  /**
   * Update verified legal business details
   */
  static async updateLegalBusinessDetails(details: Partial<LegalBusinessDetails>): Promise<LegalBusinessDetails> {
    const keysMap: Record<string, string> = {
      businessName: 'legal_business_name',
      brandName: 'legal_brand_name',
      supportEmail: 'legal_support_email',
      supportPhone: 'legal_support_phone',
      whatsappNumber: 'legal_whatsapp',
      registeredAddress: 'legal_registered_address',
      grievanceOfficerName: 'legal_grievance_officer_name',
      grievanceOfficerEmail: 'legal_grievance_officer_email',
      fssaiLicense: 'legal_fssai_license',
      gstin: 'legal_gstin',
    };

    try {
      const supabase = createAdminClient();
      for (const [prop, val] of Object.entries(details)) {
        const dbKey = keysMap[prop];
        if (dbKey && val !== undefined) {
          await supabase
            .from('business_settings')
            .upsert(
              {
                key: dbKey,
                value: typeof val === 'string' ? JSON.stringify(val) : val,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'key' }
            );
        }
      }
    } catch (e) {
      console.warn('[LegalService.updateLegalBusinessDetails] Supabase error, updating fallback:', e);
    }

    const fallback = readFallbackData();
    fallback.businessDetails = {
      ...fallback.businessDetails,
      ...details,
    };
    writeFallbackData(fallback);

    return fallback.businessDetails;
  }

  /**
   * Internal audit log helper
   */
  private static async logAuditAction(params: {
    adminId?: string;
    adminEmail?: string;
    documentId: string;
    action: 'create_draft' | 'update_draft' | 'publish_version' | 'archive_version';
    previousVersion?: string | null;
    newVersion?: string | null;
    details?: Record<string, any>;
  }) {
    const record: Partial<LegalAuditLog> = {
      admin_id: params.adminId || null,
      admin_email: params.adminEmail || null,
      document_id: params.documentId,
      action: params.action,
      previous_version: params.previousVersion || null,
      new_version: params.newVersion || null,
      details: params.details || {},
    };

    try {
      const supabase = createAdminClient();
      await supabase.from('legal_audit_logs').insert(record);
    } catch {
      const fallback = readFallbackData();
      fallback.auditLogs.push({
        id: `aud-${Date.now()}`,
        ...record,
        created_at: new Date().toISOString(),
      });
      writeFallbackData(fallback);
    }
  }
}

