import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, MapPin, HeartHandshake } from 'lucide-react';
import { FarmerService } from '@/services/farmer.service';
import { Farmer } from '@/types/database';

export const revalidate = 60;

export default async function FarmersPage() {
  const [farmers, payments] = await Promise.all([
    FarmerService.getActiveFarmers().catch(() => [] as Farmer[]),
    FarmerService.getFarmerPayments().catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Header */}
      <div className="bg-emerald-950 text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-emerald-300 hover:text-white transition mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-900/80 px-3.5 py-1 rounded-full border border-emerald-800 mb-4">
            Telangana Direct Partner Farms
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Meet the Farmers Behind Your Weekly Harvest
          </h1>
          <p className="text-emerald-100/80 text-base sm:text-lg max-w-2xl mt-4 leading-relaxed">
            We partner directly with smallholder farmers across Chevella, Shankarpally, and Rangareddy district. Zero middlemen, fair mandi + 15% benchmarks, and complete payment transparency.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Fair Price Commitment Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Mandi + 15% Guaranteed</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Farmers receive a premium over the prevailing wholesale rate to support sustainable farming practices.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Direct UPI Payments</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Zero agent cuts or commission deductions. Direct settlement to farmer bank accounts on delivery.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Harvest-to-Door in 18h</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Vegetables harvested Saturday morning reach your kitchen by Sunday morning for peak nutrition.
              </p>
            </div>
          </div>
        </div>

        {/* Farmers Grid */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Partner Farmer Profiles</h2>
              <p className="text-sm text-slate-600">Active regional growers supplying this week&apos;s harvest baskets</p>
            </div>
          </div>

          {farmers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <p className="text-slate-500 text-sm">No partner farmer profiles found at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {farmers.map((farmer) => (
                <div
                  key={farmer.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-emerald-100 flex-shrink-0">
                        <Image
                          src={farmer.photo_url || '/images/hero-vegetables.png'}
                          alt={farmer.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{farmer.name}</h3>
                        <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {farmer.village}, {farmer.district}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                      {farmer.description || 'Dedicated local grower delivering fresh, naturally cultivated vegetables for Hyderabad communities.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Verified Telangana Farmer
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {farmer.state || 'Telangana'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transparency Logs */}
        {payments && payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Recent Farmer Settlement Logs</h3>
            <p className="text-xs text-slate-500 mb-6">Real-time fair price disbursement records</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold uppercase">
                    <th className="pb-3">Farmer</th>
                    <th className="pb-3">Village</th>
                    <th className="pb-3">Produce Batch</th>
                    <th className="pb-3 text-right">Amount Paid</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {payments.slice(0, 5).map((pay: any) => (
                    <tr key={pay.id}>
                      <td className="py-3 font-semibold text-slate-900">{pay.farmer?.name || 'Local Farmer'}</td>
                      <td className="py-3 text-slate-600">{pay.farmer?.village || 'Chevella'}</td>
                      <td className="py-3 text-slate-600">{pay.crop_name || 'Weekly Harvest Basket'}</td>
                      <td className="py-3 text-right font-bold text-emerald-600">₹{pay.amount?.toLocaleString('en-IN') || 0}</td>
                      <td className="py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Disbursed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
