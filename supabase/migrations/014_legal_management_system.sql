-- ====================================================================
-- MIGRATION 014: COMPLETE LEGAL POLICY MANAGEMENT SYSTEM
-- Terms & Conditions and Privacy Policy for Easy Farm (easyfarm.co.in)
-- ====================================================================

-- 1. LEGAL DOCUMENTS TABLE (Primary Document Registry)
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- 'terms-and-conditions' | 'privacy-policy'
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  current_version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEGAL DOCUMENT VERSIONS TABLE (Immutable Version Snapshots)
CREATE TABLE IF NOT EXISTS legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary_of_changes TEXT,
  requires_reacceptance BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);

-- 3. LEGAL ACCEPTANCE RECORDS TABLE (Customer Explicit Acceptance Tracking)
CREATE TABLE IF NOT EXISTS legal_acceptance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acceptance_source TEXT NOT NULL DEFAULT 'website' CHECK (acceptance_source IN ('website', 'mobile_app')),
  event_type TEXT NOT NULL DEFAULT 'registration' CHECK (event_type IN ('registration', 'reacceptance', 'login_update')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, document_id, version)
);

-- 4. LEGAL AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS legal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_version TEXT,
  new_version TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_legal_docs_key ON legal_documents(key);
CREATE INDEX IF NOT EXISTS idx_legal_docs_status ON legal_documents(status);
CREATE INDEX IF NOT EXISTS idx_legal_versions_doc_ver ON legal_document_versions(document_id, version);
CREATE INDEX IF NOT EXISTS idx_legal_versions_status ON legal_document_versions(status);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_cust ON legal_acceptance_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_doc_ver ON legal_acceptance_records(document_id, version);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR LEGAL DOCUMENTS & VERSIONS
-- Public can read published legal documents
DROP POLICY IF EXISTS "Public can view published legal documents" ON legal_documents;
CREATE POLICY "Public can view published legal documents"
  ON legal_documents FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Admins have full access to legal documents" ON legal_documents;
CREATE POLICY "Admins have full access to legal documents"
  ON legal_documents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public can read published versions
DROP POLICY IF EXISTS "Public can view published legal versions" ON legal_document_versions;
CREATE POLICY "Public can view published legal versions"
  ON legal_document_versions FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Admins have full access to legal document versions" ON legal_document_versions;
CREATE POLICY "Admins have full access to legal document versions"
  ON legal_document_versions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Customers can view their own acceptance records
DROP POLICY IF EXISTS "Customers can view their own acceptance records" ON legal_acceptance_records;
CREATE POLICY "Customers can view their own acceptance records"
  ON legal_acceptance_records FOR SELECT
  USING (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "Customers can insert their own acceptance records" ON legal_acceptance_records;
CREATE POLICY "Customers can insert their own acceptance records"
  ON legal_acceptance_records FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "Admins have full access to acceptance records" ON legal_acceptance_records;
CREATE POLICY "Admins have full access to acceptance records"
  ON legal_acceptance_records FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Audit logs accessible to admins only
DROP POLICY IF EXISTS "Admins can view legal audit logs" ON legal_audit_logs;
CREATE POLICY "Admins can view legal audit logs"
  ON legal_audit_logs FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert legal audit logs" ON legal_audit_logs;
CREATE POLICY "Admins can insert legal audit logs"
  ON legal_audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- 8. INITIAL DOCUMENT SEEDING
INSERT INTO legal_documents (id, key, title, slug, current_version, status, effective_date, published_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'terms-and-conditions', 'Terms & Conditions', 'terms-and-conditions', '1.0', 'published', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'privacy-policy', 'Privacy Policy', 'privacy-policy', '1.0', 'published', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  status = 'published';

-- 9. SEED LEGAL BUSINESS SETTINGS
INSERT INTO business_settings (key, value, description)
VALUES
  ('legal_business_name', '"Easy Farm Fresh Produce"', 'Official legal registered entity name'),
  ('legal_brand_name', '"Easy Farm"', 'Trading brand name'),
  ('legal_support_email', '"business@easyfarm.co.in"', 'Official customer support email'),
  ('legal_support_phone', '"+91 40 8899 7766"', 'Official customer support phone number'),
  ('legal_whatsapp', '"+91 98490 12345"', 'Official WhatsApp support number'),
  ('legal_registered_address', '"Easy Farm Distribution Hub, Ghatkesar & Pocharam, Hyderabad, Telangana – 500088"', 'Registered operations address'),
  ('legal_grievance_officer_name', '"Grievance Redressal Officer"', 'Designated legal grievance officer'),
  ('legal_grievance_officer_email', '"grievance@easyfarm.co.in"', 'Grievance officer contact email'),
  ('legal_fssai_license', '""', 'FSSAI License registration number (Admin editable)'),
  ('legal_gstin', '""', 'GSTIN identification number (Admin editable)')
ON CONFLICT (key) DO NOTHING;

