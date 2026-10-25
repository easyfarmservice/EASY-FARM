import { AdminLayout } from '@/components/admin/AdminLayout';

export const metadata = { title: 'Payments Audit | Easy Farm Admin' };

export default function AdminPaymentsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Razorpay Payment Logs</h1>
          <p className="text-xs text-slate-500 mt-1">Audit customer payment transactions and webhook verification logs.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-xs text-slate-500">All customer payments verified server-side before order confirmation.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
