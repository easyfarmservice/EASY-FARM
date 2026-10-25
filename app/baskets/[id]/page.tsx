import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { BasketService } from '@/services/basket.service';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { StapleBoxZeptoView } from '@/components/basket/StapleBoxZeptoView';
import { CustomBoxZeptoView } from '@/components/basket/CustomBoxZeptoView';
import { Leaf, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const basket = await BasketService.getBasketByIdOrSlug(id);
  if (!basket) {
    return { title: 'Basket Not Found | Easy Farm' };
  }
  return {
    title: `${basket.name} | Easy Farm`,
    description: `${basket.description}. Freshly harvested from local Telangana farmers for Sunday delivery.`,
  };
}

export default async function BasketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const basket = await BasketService.getBasketByIdOrSlug(id);

  if (!basket) {
    notFound();
  }

  // Handle inactive or unpublished basket
  if (basket.active === false) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
        <Header />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{basket.name} is Currently Unavailable</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
            This basket is currently unpublished or inactive. Our farmers and operations team only deliver freshly harvested, active weekly baskets.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition shadow-md inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Active Baskets</span>
            </Link>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  const isCustom = basket.slug?.includes('custom') || basket.id.endsWith('4');

  // CUSTOM BOX VIEW
  if (isCustom) {
    const products = await UnifiedBasketService.getAllProducts();
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="flex-1">
          <CustomBoxZeptoView products={products} customBasket={basket} />
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  // STAPLE BOX VIEW
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">
        <StapleBoxZeptoView basket={basket} initialItems={basket.items} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
