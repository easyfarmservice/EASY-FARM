import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { QrCode, ShieldCheck, MapPin, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Batch Traceability & Farmer Payout Verification | Easy Farm',
  description: 'Public QR batch traceability record verifying direct farmer compensation and harvest origins.',
};

export default async function TransparencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recordId = id || 'batch-ghb-998';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6">
        {/* HEADER */}
        <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 space-y-3 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-emerald-300 flex items-center justify-center mx-auto">
            <QrCode className="w-7 h-7" />
          </div>
          <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
            Verified Telangana Batch Record
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">Batch Traceability #{recordId}</h1>
          <p className="text-xs text-emerald-200">
            Scanned via Easy Farm Basket QR Code
          </p>
        </div>

        {/* VERIFIED DETAILS CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>Fair Trade Guarantee: Farmer paid 15.9% above mandi benchmark for this harvest.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-medium">Primary Farmer</span>
              <p className="font-bold text-slate-900 text-sm">K. Rajamma</p>
              <p className="text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                Chevella Village, Ranga Reddy District
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-medium">Harvest Date</span>
              <p className="font-bold text-slate-900 text-sm">Saturday Morning (Plucked to order)</p>
              <p className="text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Delivered Sunday 6 PM
              </p>
            </div>
          </div>

          {/* PAYOUT BREAKDOWN */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Transparent Payout Breakdown</h3>
            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Produce Sourced</span>
                <span className="font-bold text-slate-900">Country Tomatoes & Fresh Palak</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Telangana Mandi Benchmark Rate</span>
                <span className="text-slate-500">₹22.00 / kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Easy Farm Direct Rate Paid</span>
                <span className="font-bold text-emerald-700">₹25.50 / kg</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-800">Total Direct Payout Reference</span>
                <span className="text-emerald-800">UPI-CHEVELLA-998240</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/how-it-works"
              className="inline-flex items-center text-xs font-bold text-emerald-800 hover:underline"
            >
              Learn more about Easy Farm's farm-to-table model
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
