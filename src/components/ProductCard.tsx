import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Leaf,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Product } from '../types';
import {
  buildWhatsAppDirectProductUrl,
  formatMad,
  getLocalizedField,
  getProductQuantityMode,
} from '../utils/commerce';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang, t, addToCart, siteContent, navigate } = useApp();
  const qtyMode = getProductQuantityMode(product);
  const isOliveOil = qtyMode === 'liters';
  const isKiloProduct = qtyMode === 'kilo';
  const isQuantityProduct = qtyMode === 'quantity';
  const isDirectStepperProduct =
    isOliveOil || isKiloProduct || (isQuantityProduct && (!product.variants || product.variants.length <= 1));
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    () => product.variants?.[0]?.id || ''
  );
  const [liters, setLiters] = useState<number>(1);

  useEffect(() => {
    if (product.variants.length > 0 && !product.variants.some((v) => v.id === selectedVariantId)) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product.variants, selectedVariantId]);

  const activeVariant = isOliveOil
    ? product.variants.find((v) => v.id === '1l') || product.variants[0]
    : isKiloProduct
      ? undefined
      : product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const name = getLocalizedField(product, 'name', lang);
  const desc = getLocalizedField(product, 'desc', lang);
  const baseUnit = getLocalizedField(product, 'unit', lang);
  const quantityUnitLabel =
    baseUnit && !/\b(kg|kilo)\b|كغ|كيلو/i.test(baseUnit)
      ? baseUnit
      : lang === 'ar'
        ? `${liters} ${t.productDetail.quantity}`
        : `${liters} × ${t.productDetail.quantity}`;
  const displayUnit = isOliveOil
    ? lang === 'ar'
      ? `${liters} لتر`
      : `${liters} ${liters > 1 ? 'Litres' : 'Litre'}`
    : isKiloProduct
      ? lang === 'ar'
        ? `${liters} كغ`
        : `${liters} kg`
      : isQuantityProduct
        ? quantityUnitLabel
        : activeVariant
          ? getLocalizedField(activeVariant, 'label', lang)
          : baseUnit;
  const unitPrice = activeVariant ? activeVariant.price_mad : product.price_mad;
  const displayPrice = isDirectStepperProduct ? unitPrice * liters : unitPrice;
  const displayStock = activeVariant
    ? Math.min(product.stock, activeVariant.stock)
    : product.stock;

  const categoryLabel =
    product.category === 'vegetables'
      ? t.nav.vegetables
      : product.category === 'olive-oil'
        ? t.nav.oliveOil
        : t.nav.poultry;

  const isInStock = product.available && displayStock > 0;
  const hasMultipleOptions = !isDirectStepperProduct && product.variants && product.variants.length > 1;
  const variantLabel = activeVariant
    ? getLocalizedField(activeVariant, 'label', lang)
    : undefined;

  const whatsappUrl = buildWhatsAppDirectProductUrl(
    siteContent?.whatsapp || '+212 654 53 85 95',
    product,
    isDirectStepperProduct ? liters : 1,
    variantLabel,
    lang
  );

  return (
    <article className="group flex flex-col bg-white rounded-2xl border border-[#DCE8DF] overflow-hidden shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#1B6B3A]/45">
      <a
        href={`/product/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/product/${product.slug}`);
        }}
        className="block relative aspect-[16/10] bg-[#EDF4EE] overflow-hidden"
      >
        <ResilientImage
          src={product.image_url}
          alt={name}
          fallbackLabel={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A2918]/55 via-transparent to-transparent pointer-events-none" />

        {/* Corner Badges */}
        <span className="absolute top-3 start-3 inline-flex items-center px-2.5 py-1 rounded-full bg-[#0E3B22]/85 text-white text-[11px] font-semibold backdrop-blur-xs">
          {categoryLabel}
        </span>

        {product.featured && (
          <span className="absolute top-3 end-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5B731] text-[#0F2418] text-[11px] font-bold shadow-xs">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            <span>{t.common.bestseller}</span>
          </span>
        )}

        <span className="absolute bottom-3 start-3 inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#0F2418]/75 text-white text-[11px] font-medium backdrop-blur-xs">
          {isInStock ? t.common.inStock : t.common.outOfStock}
        </span>
      </a>

      <div className="flex-1 flex flex-col p-5 gap-4">
        <div className="space-y-1.5">
          <h3 className="font-display text-base sm:text-lg font-bold text-[#0F2418] leading-snug line-clamp-1">
            <a
              href={`/product/${product.slug}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/product/${product.slug}`);
              }}
              className="hover:text-[#1B6B3A] transition-colors"
            >
              {name}
            </a>
          </h3>
          <p className="text-xs sm:text-sm text-[#516358] leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {desc}
          </p>
        </div>

        {/* 3-Tile Reference Spec Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#F3F8F4] rounded-xl px-2 py-2 text-center space-y-0.5">
            <Package className="w-3.5 h-3.5 mx-auto text-[#1B6B3A]" aria-hidden="true" />
            <div className="text-[11px] font-semibold text-[#0F2418] truncate">{displayUnit}</div>
          </div>
          <div className="bg-[#F3F8F4] rounded-xl px-2 py-2 text-center space-y-0.5">
            <Leaf className="w-3.5 h-3.5 mx-auto text-[#1B6B3A]" aria-hidden="true" />
            <div className="text-[11px] font-semibold text-[#0F2418] truncate">
              {t.common.originChaouia}
            </div>
          </div>
          <div className="bg-[#F3F8F4] rounded-xl px-2 py-2 text-center space-y-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-[#1B6B3A]" aria-hidden="true" />
            <div className="text-[11px] font-semibold text-[#0F2418] tabular-nums truncate">
              {isInStock ? `${displayStock} ${t.common.unitsLeft}` : t.common.outOfStock}
            </div>
          </div>
        </div>

        {/* Bottom Pricing, Select & CTA Module */}
        <div className="mt-auto space-y-3">
          {isDirectStepperProduct ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#CFE0D4] bg-[#F4F8F5] px-3 py-2">
              <span className="text-xs font-semibold text-[#0F2418]">
                {isOliveOil
                  ? t.productDetail.liters
                  : isKiloProduct
                    ? t.productDetail.kilo
                    : t.productDetail.quantity}
              </span>
              <div className="inline-flex items-center border border-[#CFE0D4] rounded-lg bg-white">
                <button
                  type="button"
                  aria-label={
                    isOliveOil
                      ? 'Decrease liters'
                      : isKiloProduct
                        ? 'Decrease kilo'
                        : 'Decrease quantity'
                  }
                  onClick={() => setLiters((l) => Math.max(1, l - 1))}
                  className="w-7 h-7 inline-flex items-center justify-center hover:bg-[#EDF4EE] rounded-s-lg"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-2.5 text-xs font-bold tabular-nums">{liters}</span>
                <button
                  type="button"
                  aria-label={
                    isOliveOil
                      ? 'Increase liters'
                      : isKiloProduct
                        ? 'Increase kilo'
                        : 'Increase quantity'
                  }
                  onClick={() => setLiters((l) => Math.min(Math.max(1, displayStock), l + 1))}
                  className="w-7 h-7 inline-flex items-center justify-center hover:bg-[#EDF4EE] rounded-e-lg"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : hasMultipleOptions && (
            <div className="space-y-1">
              <label
                htmlFor={`variant-${product.id}`}
                className="block text-[11px] font-semibold text-[#4A5D52]"
              >
                {t.productDetail.selectOption}
              </label>
              <div className="relative">
                <select
                  id={`variant-${product.id}`}
                  value={activeVariant?.id || ''}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#CFE0D4] bg-[#F4F8F5] ps-3 pe-8 py-2 text-xs sm:text-sm font-semibold text-[#0F2418] focus:border-[#1B6B3A] focus:bg-white focus:outline-none cursor-pointer"
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {getLocalizedField(v, 'label', lang)} — {formatMad(v.price_mad, lang)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-4 h-4 text-[#1B6B3A] absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* Price + Payment Terms Row */}
          <div className="pt-3 border-t border-[#EBF2EC] flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] text-[#516358]">{t.common.farmPrice}</div>
              <div className="text-lg sm:text-xl font-extrabold text-[#0F2418] tabular-nums">
                {formatMad(displayPrice, lang)}
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B6B3A] bg-[#EDF5EF] px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.common.codAvailable}</span>
            </div>
          </div>

          {/* Action Row: Primary Dark Forest CTA + Square WhatsApp Quick Order */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!isInStock}
              onClick={() => addToCart(product, isDirectStepperProduct ? liters : 1, activeVariant)}
              aria-label={`${t.common.addToCart} — ${name}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-[#0E3B22] text-white hover:bg-[#082716] disabled:bg-[#E2EBE4] disabled:text-[#516358] disabled:cursor-not-allowed transition-colors whitespace-nowrap min-h-[42px]"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.common.addToCart}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t.common.orderWhatsapp} — ${name}`}
              title={t.common.orderWhatsapp}
              className="w-[42px] h-[42px] rounded-xl border border-[#CFE0D4] bg-[#F3F8F4] hover:bg-[#E5F2E8] text-[#1B6B3A] inline-flex items-center justify-center shrink-0 transition-colors"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
