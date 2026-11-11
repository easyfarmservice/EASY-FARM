'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Scale,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Save,
  Send,
  History,
  Download,
  Building,
  UserCheck,
  Check,
  ExternalLink,
  Users,
} from 'lucide-react';
import type {
  LegalDocumentKey,
  LegalDocument,
  LegalDocumentVersion,
  LegalBusinessDetails,
  LegalAcceptanceStats,
} from '@/types/legal';

export default function AdminLegalManagementPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'stats' | 'business'>('editor');
  const [selectedKey, setSelectedKey] = useState<LegalDocumentKey>('terms-and-conditions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Versions and active editing state
  const [currentDoc, setCurrentDoc] = useState<LegalDocument | null>(null);
  const [versions, setVersions] = useState<LegalDocumentVersion[]>([]);
  const [versionNumber, setVersionNumber] = useState('');
  const [summaryOfChanges, setSummaryOfChanges] = useState('');
  const [requiresReacceptance, setRequiresReacceptance] = useState(false);
  const [documentContent, setDocumentContent] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [viewingVersionSnapshot, setViewingVersionSnapshot] = useState<LegalDocumentVersion | null>(null);

  // Stats and Business details
  const [stats, setStats] = useState<LegalAcceptanceStats | null>(null);
  const [businessDetails, setBusinessDetails] = useState<LegalBusinessDetails | null>(null);

  const fetchDocumentData = async (key: LegalDocumentKey) => {
    try {
      const res = await fetch(`/api/admin/legal/versions?slug=${key}`);
      if (res.ok) {
        const data = await res.json();
        const docVersions: LegalDocumentVersion[] = data.versions || [];
        setVersions(docVersions);
        if (data.document) setCurrentDoc(data.document);

        // Find active published or draft
        const draft = docVersions.find((v) => v.status === 'draft');
        const published = docVersions.find((v) => v.status === 'published');

        if (draft) {
          setVersionNumber(draft.version);
          setSummaryOfChanges(draft.summary_of_changes || '');
          setRequiresReacceptance(draft.requires_reacceptance || false);
          setDocumentContent(draft.content || '');
        } else if (published) {
          // Increment minor version for draft prep
          const parts = published.version.split('.');
          const nextMinor = parts.length === 2 ? `${parts[0]}.${parseInt(parts[1], 10) + 1}` : '1.1';
          setVersionNumber(nextMinor);
          setSummaryOfChanges('');
          setRequiresReacceptance(false);
          setDocumentContent(published.content || '');
        }
      }
    } catch (err: any) {
      console.error('Error fetching legal document data:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/legal/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchBusinessSettings = async () => {
    try {
      const res = await fetch('/api/admin/legal/settings');
      if (res.ok) {
        const data = await res.json();
        setBusinessDetails(data.businessDetails || null);
      }
    } catch (err) {
      console.error('Error fetching business settings:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchDocumentData(selectedKey),
      fetchStats(),
      fetchBusinessSettings(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/legal/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedKey,
          action: 'draft',
          versionNumber: versionNumber.trim() || '1.1',
          content: documentContent,
          summaryOfChanges,
          requiresReacceptance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save draft');
      }

      setFeedback({ type: 'success', message: `Draft saved successfully for Version ${data.version.version}.` });
      await fetchDocumentData(selectedKey);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!versionNumber.trim()) {
      setFeedback({ type: 'error', message: 'Please specify a version number before publishing.' });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to publish Version ${versionNumber}? ${
          requiresReacceptance
            ? '\n\n⚠️ RE-ACCEPTANCE IS ENABLED: All active registered customers will be prompted to re-accept upon their next visit.'
            : ''
        }`
      )
    ) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/legal/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedKey,
          action: 'publish',
          versionNumber: versionNumber.trim(),
          content: documentContent,
          summaryOfChanges,
          requiresReacceptance,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish version');
      }

      setFeedback({
        type: 'success',
        message: `Version ${data.version.version} is now live and published to all customers!`,
      });
      await fetchDocumentData(selectedKey);
      await fetchStats();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessDetails) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/legal/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDetails }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update legal settings');

      setFeedback({ type: 'success', message: 'Legal business & grievance settings saved successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const publishedVersion = versions.find((v) => v.status === 'published');

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Legal Policy Management
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Authoritative Terms &amp; Conditions and Privacy Policy controls with version auditing
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <a
              href={selectedKey === 'terms-and-conditions' ? '/terms-and-conditions' : '/privacy-policy'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Page</span>
            </a>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs and Slug Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Document Selector Pills */}
          <div className="inline-flex bg-slate-200/80 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setSelectedKey('terms-and-conditions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedKey === 'terms-and-conditions'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Terms &amp; Conditions</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedKey('privacy-policy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedKey === 'privacy-policy'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Privacy Policy</span>
            </button>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex bg-white border border-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto scrollbar-none no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3Icon className="w-3.5 h-3.5" />
              <span>Editor &amp; Publish</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Version History ({versions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Acceptance &amp; Export</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'business'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Grievance &amp; Entity</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: EDITOR & PUBLISH WORKFLOW ───────────────────────── */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Published Live Document:
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                    Version {publishedVersion?.version || currentDoc?.current_version || '1.0'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Effective Date:{' '}
                  <strong className="text-slate-800">
                    {publishedVersion?.effective_date
                      ? new Date(publishedVersion.effective_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Active'}
                  </strong>{' '}
                  • Changes: {publishedVersion?.summary_of_changes || 'Initial baseline'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Formatted</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Version</span>
                </button>
              </div>
            </div>

            {/* Editor Form */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Version Number *
                  </label>
                  <input
                    type="text"
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                    placeholder="e.g. 1.1 or 2.0"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Increment minor for updates, major for legal overhauls.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Summary of Changes
                  </label>
                  <input
                    type="text"
                    value={summaryOfChanges}
                    onChange={(e) => setSummaryOfChanges(e.target.value)}
                    placeholder="e.g. Added section regarding weekly cutoff and updated grievance officer contact."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Recorded in system audit log and displayed to customers during re-acceptance.</p>
                </div>
              </div>

              {/* Material Change / Re-acceptance Checkbox */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4.5 flex items-start gap-3.5">
                <input
                  type="checkbox"
                  id="reacceptance"
                  checked={requiresReacceptance}
                  onChange={(e) => setRequiresReacceptance(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="reacceptance" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                  <strong className="block text-amber-950 font-bold mb-0.5">
                    Require Existing Customer Re-Acceptance (Material Policy Change)
                  </strong>
                  Check this box if this version introduces material changes to terms, pricing, dispute handling, or privacy collection that require existing logged-in customers to acknowledge and re-accept upon their next session.
                </label>
              </div>

              {/* Markdown Content Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Full Document Content (Markdown Supported) *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {documentContent.length} characters • {documentContent.split('\n').length} lines
                  </span>
                </div>
                <textarea
                  rows={26}
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  className="w-full p-4 font-mono text-xs leading-relaxed text-slate-800 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y bg-slate-50/50"
                  placeholder="Paste or write the full markdown legal policy content here..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: VERSION HISTORY ─────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  Version History &amp; Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Every published version snapshot is immutably archived for legal compliance
                </p>
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No version snapshots recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Version</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Effective Date</th>
                      <th className="py-3 px-4">Re-Acceptance</th>
                      <th className="py-3 px-4">Summary of Changes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {versions.map((ver) => (
                      <tr key={ver.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">v{ver.version}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              ver.status === 'published'
                                ? 'bg-emerald-100 text-emerald-900'
                                : ver.status === 'draft'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {ver.effective_date
                            ? new Date(ver.effective_date).toLocaleDateString('en-IN')
                            : 'Pending'}
                        </td>
                        <td className="py-3 px-4">
                          {ver.requires_reacceptance ? (
                            <span className="text-amber-800 font-bold">Mandatory</span>
                          ) : (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                          {ver.summary_of_changes || 'Baseline version'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setViewingVersionSnapshot(ver)}
                            className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Content</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: ACCEPTANCE STATS & COMPLIANCE CSV ───────────────── */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Total Acceptances</span>
                  <Scale className="w-4 h-4 text-emerald-800" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats?.totalAcceptances || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Across all legal versions</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Unique Customers</span>
                  <Users className="w-4 h-4 text-emerald-800" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats?.uniqueCustomers || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Active customer profiles</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Terms &amp; Conditions</span>
                  <FileText className="w-4 h-4 text-emerald-800" />
                </div>
                <p className="text-2xl font-black text-emerald-800 mt-2">{stats?.termsAcceptances || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Signed contracts</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Privacy Policy</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-800" />
                </div>
                <p className="text-2xl font-black text-emerald-800 mt-2">{stats?.privacyAcceptances || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Consent records</p>
              </div>
            </div>

            {/* CSV Export & Audit Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    Compliance Audit Log &amp; Export
                  </h3>
                  <p className="text-xs text-slate-500">
                    Export full evidentiary acceptance records containing IP, User-Agent, and timestamps
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/admin/legal/export?slug=terms-and-conditions"
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Terms CSV</span>
                  </a>
                  <a
                    href="/api/admin/legal/export?slug=privacy-policy"
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Privacy CSV</span>
                  </a>
                </div>
              </div>

              {/* Recent Acceptances Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Document</th>
                      <th className="py-3 px-3">Version</th>
                      <th className="py-3 px-3">Event Type</th>
                      <th className="py-3 px-3">Platform</th>
                      <th className="py-3 px-3 text-right">Accepted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {(stats?.recentAcceptances || []).slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{item.customer_name}</p>
                          <p className="text-[10px] text-slate-400">{item.customer_email}</p>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.document_key === 'terms-and-conditions' ? 'Terms & Conditions' : 'Privacy Policy'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">v{item.version}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                            {item.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 capitalize">{item.acceptance_source}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {new Date(item.accepted_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: GRIEVANCE & VERIFIED ENTITY SETTINGS ─────────────── */}
        {activeTab === 'business' && businessDetails && (
          <form onSubmit={handleSaveBusinessSettings} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Verified Business Entity &amp; Grievance Officer Settings
              </h2>
              <p className="text-xs text-slate-500">
                These statutory details automatically populate in both published legal documents and customer support footers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operating Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessDetails.brandName}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, brandName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Active Delivery Corridor *
                </label>
                <input
                  type="text"
                  required
                  value={businessDetails.launchCorridor}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, launchCorridor: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Support Email *
                </label>
                <input
                  type="email"
                  required
                  value={businessDetails.supportEmail}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, supportEmail: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Support Phone *
                </label>
                <input
                  type="text"
                  required
                  value={businessDetails.supportPhone}
                  onChange={(e) =>
                    setBusinessDetails({ ...businessDetails, supportPhone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Statutory Grievance Redressal Officer
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Officer Name *</label>
                  <input
                    type="text"
                    required
                    value={businessDetails.grievanceOfficerName}
                    onChange={(e) =>
                      setBusinessDetails({
                        ...businessDetails,
                        grievanceOfficerName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Officer Email *</label>
                  <input
                    type="email"
                    required
                    value={businessDetails.grievanceOfficerEmail}
                    onChange={(e) =>
                      setBusinessDetails({
                        ...businessDetails,
                        grievanceOfficerEmail: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered / Operating Address
                  </label>
                  <input
                    type="text"
                    value={businessDetails.registeredAddress}
                    onChange={(e) =>
                      setBusinessDetails({
                        ...businessDetails,
                        registeredAddress: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Legal Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ─── MODAL: PREVIEW FORMATTED CONTENT ────────────────────────── */}
        {previewModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-black text-slate-900 text-sm">
                    Live Preview: {selectedKey === 'terms-and-conditions' ? 'Terms & Conditions' : 'Privacy Policy'} (v{versionNumber})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 font-sans whitespace-pre-wrap">
                {documentContent}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: VIEW PAST VERSION SNAPSHOT ──────────────────────── */}
        {viewingVersionSnapshot && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Snapshot v{viewingVersionSnapshot.version} ({viewingVersionSnapshot.status.toUpperCase()})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Effective: {viewingVersionSnapshot.effective_date ? new Date(viewingVersionSnapshot.effective_date).toLocaleDateString('en-IN') : 'N/A'} • Changes: {viewingVersionSnapshot.summary_of_changes || 'Baseline'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingVersionSnapshot(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 font-sans whitespace-pre-wrap">
                {viewingVersionSnapshot.content}
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setViewingVersionSnapshot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Edit3Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
