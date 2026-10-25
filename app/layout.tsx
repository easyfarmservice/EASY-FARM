import type { Metadata } from 'next';
import { Inter, DM_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart/CartProvider';
import { NavigationProgressBar } from '@/components/ui/NavigationProgressBar';
import { NetworkStatusNotifier } from '@/components/ui/NetworkStatusNotifier';
import { InitialSplashScreen } from '@/components/ui/InitialSplashScreen';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap', preload: false });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'Easy Farm | Fresh Telangana Vegetables Delivered in Ghatkesar',
  description:
    'Order fresh weekly vegetable baskets sourced directly from local Telangana farmers and delivered every Sunday to Singapore Township, Emerald Heights & gated communities in Ghatkesar, Hyderabad.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/logo-icon.png', sizes: 'any', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/images/logo-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased bg-white text-slate-900 selection:bg-emerald-200 selection:text-emerald-900">
        <InitialSplashScreen />
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <NetworkStatusNotifier />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
