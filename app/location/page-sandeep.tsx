import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ServiceabilityCheck } from '@/components/home/ServiceabilityCheck';
import { LocationPageMap } from '@/components/location/LocationPageMap';

export const metadata = {
  title: 'Delivery Locations & Serviceability | Easy Farm Ghatkesar',
  description: 'Check if Easy Farm delivers weekly vegetable baskets to your apartment or gated community in Ghatkesar & Pocharam, Hyderabad.',
};

export default function LocationPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <div className="bg-emerald-950 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black">Check Service Availability</h1>
            <p className="text-emerald-200 text-sm sm:text-base">
              Initial launch city: Hyderabad • Launch zone: Ghatkesar &amp; Pocharam
            </p>
          </div>
        </div>

        {/* INTERACTIVE SERVICEABILITY MAP SECTION */}
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <LocationPageMap />
        </div>

        <ServiceabilityCheck />

        {/* GATED COMMUNITIES LIST */}
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Active Service Communities in Ghatkesar &amp; Pocharam:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-950 font-semibold border border-emerald-100">
                ✓ Singapore Township (Sanskruti)
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-950 font-semibold border border-emerald-100">
                ✓ Modi Emerald Heights
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-950 font-semibold border border-emerald-100">
                ✓ Pocharam IT Corridor Residences
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-950 font-semibold border border-emerald-100">
                ✓ Modi Emerald Park &amp; Ghatkesar Enclaves
              </div>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              Don't see your community listed? Enter your location or PIN code above to request delivery expansion!
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
