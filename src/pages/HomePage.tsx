import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplets,
  Leaf,
  MessageCircle,
  Search,
  Sparkles,
  Sprout,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ProductCategory } from '../types';
import { getLocalizedField } from '../utils/commerce';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';

const HERO_IMG = '/src/assets/images/hero_moroccan_farm_1795435653916.jpg';
const VEG_IMG = '/src/assets/images/cat_fresh_vegetables_1795435654556.jpg';
const OIL_IMG = '/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg';
const POULTRY_IMG = '/src/assets/images/cat_poulet_beldi_1795435654032.jpg';

export function HomePage() {
  const { lang, t, products, productsLoading, siteContent, navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');

  const heroSubtitle = siteContent
    ? getLocalizedField(siteContent, 'heroSubtitle', lang)
    : t.home.heroSubtitle;
  const whatsappDigits = (siteContent?.whatsapp || '+212 654 53 85 95').replace(/\D/g, '');
  const testimonials = siteContent?.testimonials || [];

  const categoryCounts = useMemo(
    () => ({
      all: products.length,
      vegetables: products.filter((p) => p.category === 'vegetables').length,
      'olive-oil': products.filter((p) => p.category === 'olive-oil').length,
      poultry: products.filter((p) => p.category === 'poultry').length,
    }),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (!q) return true;
      const haystack = `${p.name_fr} ${p.name_en} ${p.name_ar} ${p.desc_fr} ${p.desc_en} ${p.desc_ar}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, searchQuery, selectedCategory]);

  const filterTabs: Array<{ key: 'all' | ProductCategory; label: string; count: number }> = [
    { key: 'all', label: t.home.filterAll, count: categoryCounts.all },
    { key: 'vegetables', label: t.nav.vegetables, count: categoryCounts.vegetables },
    { key: 'olive-oil', label: t.nav.oliveOil, count: categoryCounts['olive-oil'] },
    { key: 'poultry', label: t.nav.poultry, count: categoryCounts.poultry },
  ];

  const showcaseIcons = [Sprout, Droplets, Award];

  const scrollToCatalog = () => {
    const el = document.getElementById('home-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      {/* 1. Reference-Style Mint Split Hero with 3-Image Bento Collage & Stats Strip */}
      <section className="relative bg-gradient-to-b from-[#EBF4EE] via-[#F3F8F4] to-[#F7FAF7] border-b border-[#E3ECE5] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Text & Stats Column */}
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D4E4D8] text-xs font-bold text-[#1B6B3A] shadow-2xs">
              <Sprout className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.home.heroOrigin}</span>
            </span>

            <h1 className="font-display text-[clamp(2.25rem,4.3vw,3.65rem)] font-extrabold leading-[1.12] tracking-tight text-[#0F2418]">
              <span className="block">{t.home.heroTitle}</span>
              <span className="block text-[#1B6B3A] mt-1">{t.home.heroHighlight}</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4A5D52] leading-relaxed max-w-xl">
              {heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0E3B22] hover:bg-[#082716] text-white text-sm font-semibold transition-colors shadow-xs whitespace-nowrap shrink-0"
              >
                <span>{t.home.heroPrimaryCta}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-[#CFE0D4] bg-white hover:bg-[#F3F8F4] text-[#0F2418] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Leaf className="w-4 h-4 text-[#1B6B3A]" aria-hidden="true" />
                <span>{t.home.heroSecondaryCta}</span>
              </button>
            </div>

            {/* 3-Column Reference KPI Card Bar */}
            <div className="bg-white rounded-2xl border border-[#DCE8DF] shadow-xs grid grid-cols-3 divide-x rtl:divide-x-reverse divide-[#EBF2EC] mt-4">
              <div className="p-4 text-center">
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#0F2418] tabular-nums">
                  {t.home.statsClientsVal}
                </div>
                <div className="text-[11px] sm:text-xs text-[#516358] mt-0.5">
                  {t.home.statsClientsLabel}
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#0F2418] tabular-nums">
                  {products.length}
                </div>
                <div className="text-[11px] sm:text-xs text-[#516358] mt-0.5">
                  {t.home.statsProductsLabel}
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="font-display text-xl sm:text-2xl font-extrabold text-[#1B6B3A] tabular-nums">
                  {t.home.statsOrganicVal}
                </div>
                <div className="text-[11px] sm:text-xs text-[#516358] mt-0.5">
                  {t.home.statsOrganicLabel}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Image Organic Bento Collage (Matches Reference Screenshot) */}
          <div className="lg:col-span-6 grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Tall Primary Feature Photo with Floating Harvest Badge */}
            <div className="col-span-7 relative rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-[#DCE8DF] min-h-[300px] sm:min-h-[390px]">
              <ResilientImage
                src={HERO_IMG}
                alt="Domaine Essaoudi — Moroccan agricultural estate"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#092114]/75 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 start-3 end-3 rounded-2xl bg-[#0B2A19]/85 backdrop-blur-md border border-white/15 p-3 text-white flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t.home.heroOverlayTitle}</div>
                  <div className="text-[11px] text-[#C7DDD0] truncate">
                    {t.home.heroOverlaySub}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  aria-label={t.home.heroPrimaryCta}
                  className="w-8 h-8 rounded-full bg-white text-[#0E3B22] inline-flex items-center justify-center shrink-0 hover:bg-[#EDF5EF] transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Two Stacked Secondary Bento Cards */}
            <div className="col-span-5 flex flex-col gap-3 sm:gap-4">
              <a
                href="/chickens"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/chickens');
                }}
                className="group relative flex-1 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-[#DCE8DF] min-h-[142px] sm:min-h-[186px]"
              >
                <ResilientImage
                  src={POULTRY_IMG}
                  alt={t.nav.poultry}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#092114]/70 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-2.5 start-2.5 px-2.5 py-0.5 rounded-full bg-white/90 text-[#0F2418] text-[11px] font-bold">
                  {t.nav.poultry}
                </span>
              </a>

              <a
                href="/vegetables"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/vegetables');
                }}
                className="group relative flex-1 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-[#DCE8DF] min-h-[142px] sm:min-h-[186px]"
              >
                <ResilientImage
                  src={VEG_IMG}
                  alt={t.nav.vegetables}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#092114]/70 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-2.5 start-2.5 px-2.5 py-0.5 rounded-full bg-white/90 text-[#0F2418] text-[11px] font-bold">
                  {t.nav.vegetables}
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Reference Floating Search + Category Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-2xl border border-[#DCE8DF] p-3 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#516358] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              aria-label={t.home.searchPlaceholder}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#F4F8F5] border border-transparent focus:border-[#1B6B3A]/40 focus:bg-white focus:outline-none text-sm text-[#0F2418] placeholder:text-[#667B6E]"
            />
          </div>

          <div
            role="group"
            aria-label={t.common.allCategories}
            className="flex flex-wrap items-center gap-2"
          >
            {filterTabs.map((tab) => {
              const active = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0E3B22] text-white'
                      : 'bg-[#F3F8F4] text-[#4A5D52] hover:bg-[#E5F0E8] hover:text-[#0F2418]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-[#0F2418]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Main Interactive Catalog Grid */}
      <section id="home-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B6B3A]">
              <Sparkles className="w-3.5 h-3.5 text-[#E8A825]" aria-hidden="true" />
              <span>{t.home.catalogKicker}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
              {t.home.catalogTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#516358]">{t.home.catalogSubtitle}</p>
          </div>

          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[#DCE8DF] text-xs font-bold text-[#0F2418] tabular-nums shrink-0 w-fit">
            {filteredProducts.length} {t.home.catalogCountLabel}
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-96 rounded-2xl bg-[#EBF3ED] border border-[#DCE8DF] animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DCE8DF] p-12 text-center space-y-3">
            <p className="text-sm text-[#516358]">{t.home.catalogEmpty}</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#0E3B22] text-white text-xs font-semibold"
            >
              {t.common.allCategories}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Dark Forest-Green Value Showcase Section (Matches Reference Dark Band) */}
      <section className="bg-[#0A2F1C] text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="text-xs font-bold text-[#F5B731]">{t.home.philosophyKicker}</div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              {t.home.philosophyTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.home.philosophyPoints.map((pt, index) => {
              const Icon = showcaseIcons[index % showcaseIcons.length];
              return (
                <div
                  key={pt.title}
                  className="bg-[#123E26] border border-[#23583B] rounded-2xl p-6 sm:p-7 space-y-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#1D5B39] border border-[#2F754E] flex items-center justify-center text-[#F5B731]">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">{pt.title}</h3>
                  <p className="text-sm text-[#B7CEC0] leading-relaxed">{pt.body}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#C7DDD0] pt-2">
            <div className="inline-flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#F5B731]" aria-hidden="true" />
              <span>{t.home.philosophyTrust1}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4BA86B]" aria-hidden="true" />
              <span>{t.home.philosophyTrust2}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Three Dedicated Category Pillars + Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Category Guides */}
        <div className="space-y-8">
          <div className="max-w-2xl space-y-1.5">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
              {t.home.pillarsTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#516358]">{t.home.pillarsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { path: '/vegetables', title: t.nav.vegetables, desc: t.home.pillarVegDesc, image: VEG_IMG },
              { path: '/olive-oil', title: t.nav.oliveOil, desc: t.home.pillarOilDesc, image: OIL_IMG },
              { path: '/chickens', title: t.nav.poultry, desc: t.home.pillarPoultryDesc, image: POULTRY_IMG },
            ].map((pillar) => (
              <a
                key={pillar.path}
                href={pillar.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(pillar.path);
                }}
                className="group bg-white rounded-2xl border border-[#DCE8DF] overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[16/10] bg-[#EDF4EE] overflow-hidden">
                  <ResilientImage
                    src={pillar.image}
                    alt={pillar.title}
                    fallbackLabel={pillar.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col space-y-2">
                  <h3 className="font-display text-lg font-bold text-[#0F2418] group-hover:text-[#1B6B3A] transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#516358] leading-relaxed flex-1">{pillar.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B6B3A] pt-1">
                    <span>{t.common.exploreCatalog}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
              {t.home.testimonialsTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((item) => (
                <blockquote
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#DCE8DF] p-6 flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <p className="text-sm text-[#35463B] leading-relaxed">
                    “{getLocalizedField(item, 'quote', lang)}”
                  </p>
                  <footer className="pt-3 border-t border-[#EDF4EE]">
                    <div className="text-sm font-bold text-[#0F2418]">{item.name}</div>
                    <div className="text-xs text-[#516358]">
                      {getLocalizedField(item, 'role', lang)} · {item.city}
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. Reference Green CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4">
        <div className="rounded-3xl bg-[#1B5E37] text-white p-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-md">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-[#FDE68A]">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.home.ctaKicker}</span>
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              {t.home.ctaBannerTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#D7EDE0] leading-relaxed">
              {t.home.ctaBannerBody}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white text-[#0E3B22] hover:bg-[#EDF5EF] text-sm font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.home.heroPrimaryCta}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#277547] border border-white/25 text-white hover:bg-[#2F8753] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>{t.home.ctaContactBtn}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
