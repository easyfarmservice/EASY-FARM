import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { UnifiedBasketService, EASY_FARM_BASKETS } from '@/services/unified-basket.service';
import { CustomBoxZeptoView } from '@/components/basket/CustomBoxZeptoView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Custom Box | Easy Farm',
  description: 'Handpick fresh seasonal vegetables directly from local Telangana farms for your Sunday doorstep delivery.',
};

export default async function SelectVegetablesPage() {
  const [products, allBasketsWithPricing] = await Promise.all([
    UnifiedBasketService.getAllProducts(),
    UnifiedBasketService.getAllBasketsWithPricing(),
  ]);

  // Find the custom basket definition
  const customBasketObj = allBasketsWithPricing.find(
    (b) => b.basket.id.endsWith('4') || b.basket.slug?.includes('custom')
  )?.basket || EASY_FARM_BASKETS.find((b) => b.id.endsWith('4')) || {
    id: '33333333-0000-0000-0000-000000000004',
    name: 'Custom Box',
    slug: 'custom-basket',
    description: 'Build your own box from scratch. Pick whatever you like from our complete local harvest catalogue.',
    price: 450,
    compare_at_price: 580,
    image_url: '/images/hero-vegetables.png',
    active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">
        <CustomBoxZeptoView
          products={products}
          customBasket={customBasketObj as any}
        />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
