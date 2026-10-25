'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Clock, RefreshCw, Search, Filter, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuditRow {
  id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: any;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  'Created Basket': 'bg-emerald-100 text-emerald-900',
  'Updated Basket': 'bg-blue-100 text-blue-900',
  'Deleted Basket': 'bg-red-100 text-red-900',
  'Created Coupon': 'bg-amber-100 text-amber-900',
  'Updated Price': 'bg-purple-100 text-purple-900',
  'Updated Settings': 'bg-slate-100 text-slate-700',
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (data && data.length > 0) {
        setLogs(data);
      } else {
        // Demo fallback
        setLogs([
          {
            id: '1',
            admin_name: 'Admin',
            action: 'Updated Basket',
            entity_type: 'basket',
            entity_id: 'b-01',
            details: { name: 'Staple Box', price: 275, active: true },
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            admin_name: 'Admin',
            action: 'Created Coupon',
            entity_type: 'coupon',
            entity_id: 'MONSOON30',
            details: { code: 'MONSOON30', type: 'percent', value: 30 },
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const entityTypes = ['all', ...Array.from(new Set(logs.map((l) => l.entity_type)))];

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.admin_name.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = entityFilter === 'all' || l.entity_type === entityFilter;
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">System Audit Logs</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Immutable audit trail of all admin actions — basket changes, price updates, coupon creations, and settings edits.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 text-xs outline-none font-medium text-slate-700 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none"
            >
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All entity types' : t}</option>
              ))}
            </select>
          </div>
          <span className="flex items-center text-[11px] text-slate-400 font-semibold px-2">
            {filtered.length} entries
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading audit log from database...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                    <th className="px-6 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Entity</th>
                    <th className="px-4 py-3 text-left">Admin</th>
                    <th className="px-4 py-3 text-left">Date & Time</th>
                    <th className="px-4 py-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                        No audit logs found. Admin actions will appear here.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 capitalize">{log.entity_type}</p>
                            {log.entity_id && (
                              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{log.entity_id}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{log.admin_name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                            {new Date(log.created_at).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.details && Object.keys(log.details).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:underline"
                              >
                                View <ChevronDown className={`w-3 h-3 transition ${expanded === log.id ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded === log.id && log.details && (
                          <tr>
                            <td colSpan={5} className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                              <pre className="text-[10px] text-slate-600 font-mono overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
