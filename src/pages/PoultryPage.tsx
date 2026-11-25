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
  getProductQuantityMode,
} from '../utils/commerce';

const POULTRY_HERO = '/src/assets/images/cat_poulet_beldi_1795435654032.jpg';

export function PoultryPage() {
  const { lang, t, products, productsLoading, addToCart, setIsCartOpen, siteContent } = useApp();

  const poultryProducts = useMemo(
    () => products.filter((p) => p.category === 'poultry'),
    [products]
  );

  const singleChicken = poultryProducts.length === 1 ? poultryProducts[0] : null;
  const [quantity, setQuantity] = useState<number>(1);
  const singleQtyMode = singleChicken ? getProductQuantityMode(singleChicken) : 'kilo';
  const isSingleKilo = singleQtyMode === 'kilo';

  const singlePrice = singleChicken?.price_mad || 0;
  const singleStock = singleChicken?.stock || 0;
  const singleInStock = Boolean(singleChicken && singleChicken.available && singleStock > 0);
  const selectedKiloLabel = isSingleKilo
    ? lang === 'ar'
      ? `${quantity} كغ`
      : `${quantity} kg`
    : `${quantity} × ${t.productDetail.quantity}`;

  const singleWhatsappUrl = singleChicken
    ? buildWhatsAppDirectProductUrl(
        siteContent?.whatsapp || '+212 654 53 85 95',
        singleChicken,
        quantity,
        selectedKiloLabel,
        lang
      )
    : '#';

  const whatsappDigits = (siteContent?.whatsapp || '+212 654 53 85 95').replace(/\D/g, '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
      {/* Split Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EDF5EF] border border-[#CFE0D4] text-xs font-bold text-[#1B6B3A] w-fit">
            {t.home.heroOrigin}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F2418] leading-tight">
            {t.poultry.title}
          </h1>
          <p className="text-base text-[#4A5D52] leading-relaxed">{t.poultry.subtitle}</p>
        </div>
        <div className="lg:col-span-6">
          <div className="h-full min-h-[300px] aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-md bg-[#EDF4EE]">
            <ResilientImage
              src={POULTRY_HERO}
              alt={t.poultry.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Natural Feeding & Free-Range Practices */}
      <section className="bg-[#0A2F1C] text-white rounded-3xl p-8 sm:p-10 space-y-8">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t.poultry.practicesTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.poultry.practices.map((item, i) => (
            <div
              key={item.title}
              className="bg-[#123E26] rounded-2xl border border-[#23583B] p-6 space-y-2"
            >
              <div className="font-mono text-xs font-bold text-[#F5B731] tabular-nums">
                0{i + 1}
              </div>
              <h3 className="font-bold text-base text-white">{item.title}</h3>
              <p className="text-sm text-[#B7CEC0] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Poultry Catalog / Single Spotlight */}
      <section className="space-y-8">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
          {poultryProducts.some((p) => getProductQuantityMode(p) === 'quantity')
            ? lang === 'ar'
              ? 'اختر الكمية — الدجاج البلدي والبيض'
              : lang === 'en'
                ? 'Select quantity — Free-Range Beldi Chicken & Eggs'
                : 'Choisissez la quantité — Poulet Beldi & Œufs Fermiers'
            : t.poultry.productsTitle}
        </h2>
        {productsLoading ? (
          <div className="h-96 rounded-2xl bg-[#EBF3ED] animate-pulse" />
        ) : singleChicken ? (
          <article className="bg-white rounded-3xl border border-[#DCE8DF] overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] bg-[#EDF4EE]">
              <ResilientImage
                src={singleChicken.image_url}
                alt={getLocalizedField(singleChicken, 'name', lang)}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-4 start-4 inline-flex items-center px-3 py-1 rounded-full bg-[#0E3B22]/90 text-white text-xs font-semibold">
                {t.nav.poultry}
              </span>
              {singleChicken.featured && (
                <span className="absolute top-4 end-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F5B731] text-[#0F2418] text-xs font-bold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.common.bestseller}</span>
                </span>
              )}
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
                  {getLocalizedField(singleChicken, 'name', lang)}
                </h3>
                <p className="text-sm sm:text-base text-[#4A5D52] leading-relaxed">
                  {getLocalizedField(singleChicken, 'desc', lang)}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-[#F3F8F4] rounded-xl px-3 py-2.5 text-center space-y-0.5">
                    <Package className="w-4 h-4 mx-auto text-[#1B6B3A]" aria-hidden="true" />
                    <div className="text-xs font-bold text-[#0F2418] tabular-nums">
                      {selectedKiloLabel}
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
                      {singleInStock
                        ? `${singleStock}${isSingleKilo ? ' kg' : ''} ${t.common.unitsLeft}`
                        : t.common.outOfStock}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#EBF2EC]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Unified Quantity Stepper */}
                  <div className="flex items-center justify-between gap-4 bg-[#F4F8F5] rounded-xl px-4 py-3 border border-[#CFE0D4]">
                    <div>
                      <div className="text-xs font-bold text-[#0F2418]">
                        {isSingleKilo ? t.productDetail.kilo : t.productDetail.quantity}
                      </div>
                      <div className="text-[11px] font-medium text-[#516358] tabular-nums">
                        {formatMad(singlePrice, lang)}
                        {isSingleKilo ? ' / kg' : ''}
                      </div>
                    </div>
                    <div className="inline-flex items-center border border-[#CFE0D4] rounded-lg bg-white">
                      <button
                        type="button"
                        aria-label={isSingleKilo ? 'Decrease kilo' : 'Decrease quantity'}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 inline-flex items-center justify-center hover:bg-[#EDF4EE] rounded-s-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-bold tabular-nums">{quantity}</span>
                      <button
                        type="button"
                        aria-label={isSingleKilo ? 'Increase kilo' : 'Increase quantity'}
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
                      {selectedKiloLabel}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={!singleInStock}
                    onClick={() => {
                      addToCart(singleChicken, quantity);
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
            {poultryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Direct Order Request Callout */}
      <section className="bg-[#1B5E37] text-white rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <p className="text-sm sm:text-base text-[#D7EDE0] max-w-2xl leading-relaxed">
          {t.poultry.requestNote}
        </p>
        <a
          href={`https://wa.me/${whatsappDigits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#EDF5EF] text-[#0E3B22] text-sm font-bold transition-colors whitespace-nowrap shrink-0"
        >
          <MessageCircle className="w-4 h-4 text-[#1B6B3A]" aria-hidden="true" />
          <span>{t.common.orderWhatsapp}</span>
        </a>
      </section>
    </div>
  );
}
