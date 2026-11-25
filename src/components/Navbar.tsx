import React, { useState } from 'react';
import { Menu, ShoppingBag, Sprout, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Language } from '../types';

export function Navbar() {
  const { lang, setLang, t, cart, setIsCartOpen, route, navigate } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { path: '/vegetables', label: t.nav.vegetables },
    { path: '/olive-oil', label: t.nav.oliveOil },
    { path: '/chickens', label: t.nav.poultry },
    { path: '/about', label: t.nav.about },
    { path: '/contact', label: t.nav.contact },
  ];

  const handleNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E3ECE5]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Zone 1: Brand mark + single-line wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="inline-flex items-center gap-2 font-display text-base sm:text-xl font-extrabold tracking-tight text-[#0F2418] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1B6B3A] rounded"
        >
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0E3B22] text-white inline-flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" aria-hidden="true" />
          </span>
          <span>{lang === 'ar' ? 'مزرعة السعودي' : 'Domaine Essaoudi'}</span>
        </a>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#4A5D52]"
        >
          {navItems.map((item) => {
            const active = route === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1.5 transition-colors border-b-2 ${
                  active
                    ? 'border-[#1B6B3A] text-[#1B6B3A]'
                    : 'border-transparent hover:border-[#1B6B3A]/40 hover:text-[#0F2418]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Language Switcher + Primary Cart Action */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Language switcher"
            className="flex items-center bg-[#F2F7F3] rounded-xl p-0.5 border border-[#DCE8DF]"
          >
            {(['fr', 'en', 'ar'] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[28px] ${
                  lang === code
                    ? 'bg-[#0E3B22] text-white'
                    : 'text-[#4A5D52] hover:text-[#0F2418]'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`${t.nav.cart} (${cartCount})`}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1B6B3A] hover:bg-[#14532C] rounded-xl transition-colors whitespace-nowrap shrink-0 min-h-[38px] sm:min-h-[40px] shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{t.nav.cart}</span>
            <span className="tabular-nums">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? t.common.close : 'Menu'}
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#DCE8DF] text-[#0F2418] hover:bg-[#F2F7F3] shrink-0"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E3ECE5] bg-white px-4 py-4 space-y-1 shadow-md">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
            className={`block px-3 py-2.5 rounded-xl text-sm font-semibold ${
              route === '/' ? 'bg-[#EDF5EF] text-[#1B6B3A]' : 'text-[#0F2418]'
            }`}
          >
            {t.nav.home}
          </a>
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                handleNav(item.path);
              }}
              className={`block px-3 py-2.5 rounded-xl text-sm font-semibold ${
                route === item.path ? 'bg-[#EDF5EF] text-[#1B6B3A]' : 'text-[#0F2418]'
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/admin');
            }}
            className={`block px-3 py-2.5 rounded-xl text-sm font-semibold ${
              route === '/admin' ? 'bg-[#EDF5EF] text-[#1B6B3A]' : 'text-[#4A5D52]'
            }`}
          >
            {t.nav.admin}
          </a>
        </div>
      )}
    </header>
  );
}
