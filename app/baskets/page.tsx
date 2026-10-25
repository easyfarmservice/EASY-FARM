import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { BasketShowcase } from '@/components/home/BasketShowcase';
import { BasketService } from '@/services/basket.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Weekly Vegetable Baskets | Easy Farm Ghatkesar',
  description: 'Select your fresh weekly vegetable box (Staple Box or build your Custom Box) delivered every Sunday to Ghatkesar & Pocharam.',
};

export default async function BasketsPage() {
  const baskets = await BasketService.getActiveBaskets();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1">
        <div className="bg-emerald-950 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black">Weekly Vegetable Baskets</h1>
            <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto">
              Plucked on Saturday morning, delivered to your doorstep in Ghatkesar &amp; Pocharam on Sunday by 6 PM.
            </p>
          </div>
        </div>
        <BasketShowcase baskets={baskets} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
