import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './pages/HomePage';
import { VegetablesPage } from './pages/VegetablesPage';
import { OliveOilPage } from './pages/OliveOilPage';
import { PoultryPage } from './pages/PoultryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';

function AppShell() {
  const { route, toastMessage } = useApp();
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const renderPage = () => {
    if (route === '/' || route === '') return <HomePage />;
    if (route === '/vegetables') return <VegetablesPage />;
    if (route === '/olive-oil') return <OliveOilPage />;
    if (route === '/chickens') return <PoultryPage />;
    if (route === '/about') return <AboutPage />;
    if (route === '/contact') return <ContactPage />;
    if (route === '/admin') return <AdminPage />;
    if (route.startsWith('/product/')) {
      const slug = route.slice('/product/'.length);
      return <ProductDetailPage slugOrId={slug} />;
    }
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7FAF7] text-[#0F2418]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar />

      <main className="flex-1">{renderPage()}</main>

      <Footer />
      <CartDrawer />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 end-5 z-50 px-4 py-3 rounded-xl bg-[#0E3B22] text-white text-xs sm:text-sm font-medium shadow-lg border border-[#24593C]"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
