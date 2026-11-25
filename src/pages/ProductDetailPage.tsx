import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Product, ProductVariant } from '../types';
import {
  buildWhatsAppDirectProductUrl,
  formatMad,
  getLocalizedField,
  getProductQuantityMode,
} from '../utils/commerce';
import { ResilientImage } from '../components/ResilientImage';

export function ProductDetailPage({ slugOrId }: { slugOrId: string }) {
  const { lang, t, products, addToCart, setIsCartOpen, siteContent, navigate } = useApp();
  const [product, setProduct] = useState<Product | null>(
    () => products.find((p) => p.slug === slugOrId || p.id === slugOrId) || null
  );
  const [loading, setLoading] = useState(!product);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product?.variants[0]
  );
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const found = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
    if (found) {
      setProduct(found);
      setSelectedVariant((prev) => prev || found.variants[0]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(slugOrId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.product) {
          setProduct(data.product);
          setSelectedVariant(data.product.variants?.[0]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slugOrId, products]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-96 rounded-2xl bg-[#EDF4EE] animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-semibold text-[#0F2418]">Product not found</h1>
        <button
          type="button"
          onClick={() => navigate('/vegetables')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E3B22] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t.common.backToCatalog}</span>
        </button>
      </div>
    );
  }

  const name = getLocalizedField(product, 'name', lang);
  const desc = getLocalizedField(product, 'desc', lang);
  const unit = getLocalizedField(product, 'unit', lang);
  const harvestNote = getLocalizedField(product, 'harvest_note', lang);

  const qtyMode = getProductQuantityMode(product);
  const isOliveOil = qtyMode === 'liters';
  const isKiloProduct = qtyMode === 'kilo';
  const isQuantityProduct = qtyMode === 'quantity';
  const activeVariant = isOliveOil
    ? product.variants.find((v) => v.id === '1l') || product.variants[0]
    : isKiloProduct
      ? undefined
      : selectedVariant || product.variants[0];
  const unitPrice = activeVariant ? activeVariant.price_mad : product.price_mad;
  const displayPrice =
    isOliveOil || isKiloProduct || isQuantityProduct ? unitPrice * quantity : unitPrice;
  const maxStock = activeVariant ? Math.min(product.stock, activeVariant.stock) : product.stock;
  const isInStock = product.available && maxStock > 0;
  const variantLabel = activeVariant
    ? getLocalizedField(activeVariant, 'label', lang)
    : undefined;

  const backPath =
    product.category === 'olive-oil'
      ? '/olive-oil'
      : product.category === 'poultry'
        ? '/chickens'
        : '/vegetables';

  const categoryLabel =
    product.category === 'olive-oil'
      ? t.nav.oliveOil
      : product.category === 'poultry'
        ? t.nav.poultry
        : t.nav.vegetables;

  const displayUnit =
    isQuantityProduct && (!unit || /\b(kg|kilo)\b|كغ|كيلو/i.test(unit))
      ? `1 × ${t.productDetail.quantity}`
      : unit;

  const whatsappUrl = buildWhatsAppDirectProductUrl(
    siteContent?.whatsapp || '+212 654 53 85 95',
    product,
    quantity,
    variantLabel,
    lang
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-8">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#4A5D52] hover:text-[#0E3B22] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
        <span>{t.common.backToCatalog}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Sticky Product Image */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#DCE8DF] bg-[#EDF4EE]">
            <ResilientImage
              src={product.image_url}
              alt={name}
              fallbackLabel={name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE8DF] p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#516358]">
              <span>{categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{displayUnit}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0F2418]">
              {name}
            </h1>
            <div className="flex items-baseline gap-4 pt-1">
              <span className="text-2xl font-bold text-[#0F2418] tabular-nums">
                {formatMad(displayPrice, lang)}
              </span>
              <span className="text-xs font-semibold text-[#0E3B22]">
                {isInStock
                  ? `${t.common.inStock} (${maxStock} ${t.common.unitsLeft})`
                  : t.common.outOfStock}
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#4A5D52] leading-relaxed">{desc}</p>

          {!isOliveOil && !isKiloProduct && product.variants.length > 0 && (
            <div className="space-y-2">
              <label
                htmlFor="detail-variant-select"
                className="block text-xs font-semibold text-[#4A5D52]"
              >
                {t.productDetail.selectOption}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = activeVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariant(v);
                        setQuantity(1);
                      }}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        active
                          ? 'border-[#0E3B22] bg-[#0E3B22]/10 text-[#0F2418]'
                          : 'border-[#DCE8DF] bg-[#F7FAF7] text-[#4A5D52] hover:border-[#0E3B22]/40'
                      }`}
                    >
                      {getLocalizedField(v, 'label', lang)} · {formatMad(v.price_mad, lang)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity (Liters for Olive Oil, Kilo for Poultry & Vegetables) & Actions */}
          <div className="space-y-4 pt-2 border-t border-[#DCE8DF]">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-[#4A5D52]">
                {isOliveOil
                  ? t.productDetail.liters
                  : isKiloProduct
                    ? t.productDetail.kilo
                    : t.productDetail.quantity}
              </span>
              <div className="inline-flex items-center border border-[#DCE8DF] rounded-lg bg-[#F7FAF7]">
                <button
                  type="button"
                  aria-label={
                    isOliveOil
                      ? 'Decrease liters'
                      : isKiloProduct
                        ? 'Decrease kilo'
                        : 'Decrease quantity'
                  }
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 inline-flex items-center justify-center hover:bg-[#EDF4EE]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-semibold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label={
                    isOliveOil
                      ? 'Increase liters'
                      : isKiloProduct
                        ? 'Increase kilo'
                        : 'Increase quantity'
                  }
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, maxStock), q + 1))}
                  className="w-10 h-10 inline-flex items-center justify-center hover:bg-[#EDF4EE]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {(isOliveOil || isKiloProduct) && (
                <span className="text-xs text-[#516358] tabular-nums">
                  ({formatMad(unitPrice, lang)} / {isOliveOil ? 'L' : 'kg'})
                </span>
              )}
              {isQuantityProduct && (
                <span className="text-xs text-[#516358] tabular-nums">
                  ({formatMad(unitPrice, lang)}
                  {unit && !/\b(kg|kilo)\b|كغ|كيلو/i.test(unit) ? ` / ${unit}` : ''})
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={!isInStock}
                onClick={() => {
                  addToCart(product, quantity, activeVariant);
                  setIsCartOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#0E3B22] hover:bg-[#082716] disabled:bg-[#DCE8DF] disabled:text-[#516358] text-white text-sm font-semibold transition-colors"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>{t.common.addToCart}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-[#0E3B22] text-[#0E3B22] hover:bg-[#0E3B22]/5 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>{t.common.orderWhatsapp}</span>
              </a>
            </div>
          </div>

          {/* Harvest & Delivery Notes */}
          <div className="pt-4 border-t border-[#DCE8DF] space-y-3 text-xs text-[#516358]">
            {harvestNote && (
              <div>
                <span className="font-semibold text-[#0F2418]">
                  {t.productDetail.harvestNotes}:{' '}
                </span>
                <span>{harvestNote}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[#0E3B22] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.productDetail.deliveryInfo}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
