import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Leaf,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import {
  buildWhatsAppDirectProductUrl,
  formatMad,
  getLocalizedField,
} from '../utils/commerce';

const OIL_HERO = '/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg';

export function OliveOilPage() {
  const { lang, t, products, productsLoading, addToCart, setIsCartOpen, siteContent } = useApp();

  const oilProducts = useMemo(
    () => products.filter((p) => p.category === 'olive-oil'),
    [products]
  );

  const singleOil = oilProducts.length === 1 ? oilProducts[0] : null;
  const [quantity, setQuantity] = useState<number>(1);

  const activeVariant = singleOil
    ? singleOil.variants.find((v) => v.id === '1l') || singleOil.variants[0]
    : undefined;

  const singlePrice = activeVariant ? activeVariant.price_mad : singleOil?.price_mad || 0;
  const singleStock = singleOil
    ? activeVariant
      ? Math.min(singleOil.stock, activeVariant.stock)
      : singleOil.stock
    : 0;
  const singleInStock = Boolean(singleOil && singleOil.available && singleStock > 0);
  const variantLabel = activeVariant ? getLocalizedField(activeVariant, 'label', lang) : undefined;
  const selectedLitersLabel =
    lang === 'ar'
      ? `${quantity} لتر`
      : `${quantity} ${quantity > 1 ? 'Litres' : 'Litre'}`;

  const singleWhatsappUrl = singleOil
    ? buildWhatsAppDirectProductUrl(
        siteContent?.whatsapp || '+212 654 53 85 95',
        singleOil,
        quantity,
        variantLabel,
        lang
      )
    : '#';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
      {/* Split Editorial Intro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EDF5EF] border border-[#CFE0D4] text-xs font-bold text-[#1B6B3A] w-fit">
            {t.oliveOil.acidityNote}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F2418] leading-tight">
            {t.oliveOil.title}
          </h1>
          <p className="text-base text-[#4A5D52] leading-relaxed">{t.oliveOil.subtitle}</p>
        </div>
        <div className="lg:col-span-6">
          <div className="h-full min-h-[300px] aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-md bg-[#EDF4EE]">
            <ResilientImage
              src={OIL_HERO}
              alt={t.oliveOil.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* 4-Step Production Process */}
      <section className="bg-[#0A2F1C] text-white rounded-3xl p-8 sm:p-10 space-y-8">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t.oliveOil.processTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.oliveOil.processSteps.map((s) => (
            <div
              key={s.step}
              className="bg-[#123E26] rounded-2xl border border-[#23583B] p-5 space-y-2"
            >
              <div className="font-mono text-xs font-bold text-[#F5B731] tabular-nums">
                {s.step}
              </div>
              <h3 className="font-bold text-base text-white">{s.title}</h3>
              <p className="text-xs sm:text-sm text-[#B7CEC0] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Single Olive Oil Spotlight + Liter Select */}
      <section className="space-y-8">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
          {t.oliveOil.formatsTitle}
        </h2>
        {productsLoading ? (
          <div className="h-96 rounded-2xl bg-[#EBF3ED] animate-pulse" />
        ) : singleOil ? (
          <article className="bg-white rounded-3xl border border-[#DCE8DF] overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] bg-[#EDF4EE]">
              <ResilientImage
                src={singleOil.image_url}
                alt={getLocalizedField(singleOil, 'name', lang)}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-4 start-4 inline-flex items-center px-3 py-1 rounded-full bg-[#0E3B22]/90 text-white text-xs font-semibold">
                {t.nav.oliveOil}
              </span>
              {singleOil.featured && (
                <span className="absolute top-4 end-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5B731] text-[#0F2418] text-xs font-bold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.common.bestseller}</span>
                </span>
              )}
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
                  {getLocalizedField(singleOil, 'name', lang)}
                </h3>
                <p className="text-sm sm:text-base text-[#4A5D52] leading-relaxed">
                  {getLocalizedField(singleOil, 'desc', lang)}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-[#F3F8F4] rounded-xl px-3 py-2.5 text-center space-y-0.5">
                    <Package className="w-4 h-4 mx-auto text-[#1B6B3A]" aria-hidden="true" />
                    <div className="text-xs font-bold text-[#0F2418] tabular-nums">
                      {selectedLitersLabel}
                    </div>
                  </div>
                  <div className="bg-[#F3F8F4] rounded-xl px-3 py-2.5 text-center space-y-0.5">
                    <Leaf className="w-4 h-4 mx-auto text-[#1B6B3A]" aria-hidden="true" />
                    <div className="text-xs font-bold text-[#0F2418]">
                      {t.common.originChaouia}
                    </div>
                  </div>
                  <div className="bg-[#F3F8F4] rounded-xl px-3 py-2.5 text-center space-y-0.5">
                    <CheckCircle2 className="w-4 h-4 mx-auto text-[#1B6B3A]" aria-hidden="true" />
                    <div className="text-xs font-bold text-[#0F2418] tabular-nums">
                      {singleInStock ? `${singleStock} ${t.common.unitsLeft}` : t.common.outOfStock}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#EBF2EC]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Unified Liters Quantity Stepper */}
                  <div className="flex items-center justify-between gap-4 bg-[#F4F8F5] rounded-xl px-4 py-3 border border-[#CFE0D4]">
                    <div>
                      <div className="text-xs font-bold text-[#0F2418]">
                        {t.productDetail.liters}
                      </div>
                      <div className="text-[11px] font-medium text-[#516358] tabular-nums">
                        {formatMad(singlePrice, lang)} / L
                      </div>
                    </div>
                    <div className="inline-flex items-center border border-[#CFE0D4] rounded-lg bg-white">
                      <button
                        type="button"
                        aria-label="Decrease liters"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 inline-flex items-center justify-center hover:bg-[#EDF4EE] rounded-s-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-bold tabular-nums">{quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase liters"
                        onClick={() =>
                          setQuantity((q) => Math.min(Math.max(1, singleStock), q + 1))
                        }
                        className="w-9 h-9 inline-flex items-center justify-center hover:bg-[#EDF4EE] rounded-e-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Farm Price */}
                  <div className="flex items-center justify-between gap-4 bg-[#F4F8F5] rounded-xl px-4 py-3 border border-[#DCE8DF]">
                    <div>
                      <div className="text-[11px] font-medium text-[#516358]">
                        {t.common.farmPrice}
                      </div>
                      <div className="text-xl font-extrabold text-[#0F2418] tabular-nums">
                        {formatMad(singlePrice * quantity, lang)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-[#1B6B3A] bg-[#EDF5EF] px-2.5 py-1 rounded-lg tabular-nums">
                      {selectedLitersLabel}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={!singleInStock}
                    onClick={() => {
                      addToCart(singleOil, quantity, activeVariant);
                      setIsCartOpen(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#0E3B22] hover:bg-[#082716] disabled:bg-[#DCE8DF] disabled:text-[#516358] text-white text-sm font-semibold transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.addToCart}</span>
                  </button>

                  <a
                    href={singleWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#0E3B22] text-[#0E3B22] hover:bg-[#EDF5EF] text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.orderWhatsapp}</span>
                  </a>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {oilProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
