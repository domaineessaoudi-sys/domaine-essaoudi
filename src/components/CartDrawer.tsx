import React, { useMemo, useState } from 'react';
import { CheckCircle2, Mail, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Order } from '../types';
import {
  buildWhatsAppOrderUrl,
  calculateCartTotals,
  formatMad,
  getLocalizedField,
  validateCheckoutForm,
} from '../utils/commerce';
import {
  resolveEmailJsConfig,
  sendOrderViaEmailJS,
  sendOrderViaFormSubmit,
} from '../utils/emailjs';
import { ResilientImage } from './ResilientImage';

export function CartDrawer() {
  const {
    lang,
    t,
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    siteContent,
    refreshProducts,
  } = useApp();

  const zones = siteContent?.deliveryZones || [];
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'casablanca-chaouia');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [emailNeedsActivation, setEmailNeedsActivation] = useState(false);

  const activeZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || zones[0],
    [zones, selectedZoneId]
  );

  const totals = useMemo(
    () => calculateCartTotals(cart, activeZone, deliveryMethod),
    [cart, activeZone, deliveryMethod]
  );

  if (!isCartOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validation = validateCheckoutForm(
      {
        customerName,
        customerPhone,
        customerEmail,
        city,
        deliveryZoneId: activeZone?.id || 'casablanca-chaouia',
        address,
        deliveryMethod,
      },
      lang
    );
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          city: deliveryMethod === 'pickup' ? 'Berrechid' : city,
          delivery_zone: activeZone?.id || 'casablanca-chaouia',
          address,
          delivery_method: deliveryMethod,
          notes,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Could not place order.');
        return;
      }

      let finalOrder: Order = data.order;
      const emailjsConfig = resolveEmailJsConfig({
        ...siteContent,
        email: data.emailjs?.recipientEmail || siteContent?.email,
        emailjsServiceId: data.emailjs?.serviceId || siteContent?.emailjsServiceId,
        emailjsTemplateId: data.emailjs?.templateId || siteContent?.emailjsTemplateId,
        emailjsPublicKey: data.emailjs?.publicKey || siteContent?.emailjsPublicKey,
      });

      setEmailNeedsActivation(false);
      if (!data.emailNotification?.sent) {
        const dispatchRes = emailjsConfig.configured
          ? await sendOrderViaEmailJS(data.order, emailjsConfig)
          : await sendOrderViaFormSubmit(data.order, emailjsConfig.recipientEmail);

        if (dispatchRes.needsActivation) {
          setEmailNeedsActivation(true);
        }

        if (data.receiptProof && (dispatchRes.status === 'sent' || dispatchRes.status === 'failed')) {
          try {
            const statusRes = await fetch(`/api/orders/${data.order.id}/email-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiptProof: data.receiptProof,
                status: dispatchRes.status,
              }),
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.order) finalOrder = statusData.order;
            }
          } catch {
            if (dispatchRes.sent) {
              finalOrder = { ...finalOrder, email_status: 'sent' };
            }
          }
        } else if (dispatchRes.sent) {
          finalOrder = { ...finalOrder, email_status: 'sent' };
        }
      }

      setConfirmedOrder(finalOrder);
      clearCart();
      await refreshProducts();
    } catch {
      setSubmitError('Network error while submitting your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = confirmedOrder
    ? buildWhatsAppOrderUrl(
        siteContent?.whatsapp || '+212 654 53 85 95',
        {
          orderId: confirmedOrder.id,
          customerName: confirmedOrder.customer_name,
          customerPhone: confirmedOrder.customer_phone,
          city: confirmedOrder.city,
          address: confirmedOrder.address,
          deliveryMethod: confirmedOrder.delivery_method,
          items: confirmedOrder.items.map((i) => ({
            name: i.name,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
            price_mad: i.price_mad,
          })),
          deliveryFeeMad: confirmedOrder.delivery_fee_mad,
          totalMad: confirmedOrder.total_mad,
        },
        lang
      )
    : buildWhatsAppOrderUrl(
        siteContent?.whatsapp || '+212 654 53 85 95',
        {
          customerName,
          customerPhone,
          city,
          address,
          deliveryMethod,
          items: cart.map((c) => ({
            name: getLocalizedField(c, 'name', lang),
            variantLabel: c.variantLabel,
            quantity: c.quantity,
            price_mad: c.price_mad,
          })),
          deliveryFeeMad: totals.deliveryFeeMad,
          totalMad: totals.totalMad,
        },
        lang
      );

  const orderRecipientEmail =
    confirmedOrder?.email_recipient || siteContent?.email || 'domaineessaoudi@gmail.com';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={t.cart.title}
    >
      <div className="w-full max-w-lg bg-[#F7FAF7] h-full flex flex-col shadow-2xl border-s border-[#DCE8DF]">
        <div className="px-6 py-4 bg-white border-b border-[#DCE8DF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0E3B22]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#0F2418]">{t.cart.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCartOpen(false);
              setConfirmedOrder(null);
            }}
            aria-label={t.common.close}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-[#EDF4EE] text-[#4A5D52]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {confirmedOrder ? (
            <div className="bg-white rounded-xl border border-[#0E3B22]/30 p-6 space-y-5">
              <div className="flex items-center gap-3 text-[#0E3B22]">
                <CheckCircle2 className="w-7 h-7 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#0F2418]">
                    {t.cart.orderConfirmed}
                  </h3>
                  <p className="text-xs text-[#516358] font-mono tabular-nums mt-0.5">
                    {t.cart.orderNumber}: {confirmedOrder.id}
                  </p>
                </div>
              </div>

              <div className="border-t border-b border-[#DCE8DF] py-4 space-y-2 text-sm">
                {confirmedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-4">
                    <span className="text-[#0F2418]">
                      {item.quantity} × {item.name}
                      {item.variantLabel ? ` (${item.variantLabel})` : ''}
                    </span>
                    <span className="font-medium tabular-nums shrink-0">
                      {formatMad(item.line_total_mad, lang)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-[#516358] pt-2 border-t border-[#DCE8DF]/60">
                  <span>{t.cart.deliveryFee}</span>
                  <span className="tabular-nums">
                    {confirmedOrder.delivery_fee_mad === 0
                      ? t.cart.freeDelivery
                      : formatMad(confirmedOrder.delivery_fee_mad, lang)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#0F2418] pt-1">
                  <span>{t.cart.total}</span>
                  <span className="tabular-nums">{formatMad(confirmedOrder.total_mad, lang)}</span>
                </div>
              </div>

              <div
                className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium ${
                  emailNeedsActivation
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-[#EDF4EE] text-[#0E3B22]'
                }`}
              >
                <Mail className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {(confirmedOrder.email_status === 'sent'
                    ? t.cart.emailDispatched
                    : emailNeedsActivation
                      ? t.cart.emailActivationPending
                      : t.cart.emailSavedPending
                  ).replace('{email}', orderRecipientEmail)}
                </span>
              </div>

              <div className="space-y-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0E3B22] hover:bg-[#082716] text-white text-sm font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{t.cart.confirmWhatsapp}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedOrder(null);
                    setIsCartOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#DCE8DF] bg-white hover:bg-[#EDF4EE] text-sm font-medium text-[#0F2418] transition-colors"
                >
                  {t.cart.newOrder}
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#516358]/50" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold text-[#0F2418]">
                {t.cart.emptyTitle}
              </h3>
              <p className="text-sm text-[#516358] max-w-xs mx-auto">{t.cart.emptyBody}</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const name = getLocalizedField(item, 'name', lang);
                  return (
                    <div
                      key={`${item.productId}-${item.variantId || 'default'}`}
                      className="flex gap-3.5 bg-white p-3.5 rounded-xl border border-[#DCE8DF]"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#EDF4EE] shrink-0">
                        <ResilientImage
                          src={item.image_url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[#0F2418] leading-snug">
                              {name}
                            </h4>
                            {item.variantLabel && (
                              <p className="text-xs text-[#516358] mt-0.5">{item.variantLabel}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.variantId)}
                            aria-label={`${t.common.delete} ${name}`}
                            className="p-1 text-[#516358] hover:text-[#9E2A2B] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#DCE8DF] rounded-lg bg-[#F7FAF7]">
                            <button
                              type="button"
                              aria-label={`Decrease quantity for ${name}`}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              className="w-8 h-8 inline-flex items-center justify-center text-[#0F2418] hover:bg-[#EDF4EE]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity for ${name}`}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              className="w-8 h-8 inline-flex items-center justify-center text-[#0F2418] hover:bg-[#EDF4EE]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-bold text-[#0F2418] tabular-nums">
                            {formatMad(item.price_mad * item.quantity, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Mode & Zone */}
              <div className="bg-white p-4 rounded-xl border border-[#DCE8DF] space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#EDF4EE] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                      deliveryMethod === 'delivery'
                        ? 'bg-white text-[#0F2418] shadow-sm'
                        : 'text-[#516358]'
                    }`}
                  >
                    {t.common.deliveryLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                      deliveryMethod === 'pickup'
                        ? 'bg-white text-[#0F2418] shadow-sm'
                        : 'text-[#516358]'
                    }`}
                  >
                    {t.common.pickupLabel}
                  </button>
                </div>

                {deliveryMethod === 'delivery' && zones.length > 0 && (
                  <div>
                    <label
                      htmlFor="checkout-zone"
                      className="block text-xs font-semibold text-[#4A5D52] mb-1.5"
                    >
                      {t.cart.deliveryZone}
                    </label>
                    <select
                      id="checkout-zone"
                      value={activeZone?.id || ''}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7] text-[#0F2418]"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {getLocalizedField(z, 'name', lang)} — {formatMad(z.fee_mad, lang)}
                        </option>
                      ))}
                    </select>
                    {activeZone && (
                      <p className="text-xs text-[#516358] mt-1.5">
                        {getLocalizedField(activeZone, 'eta', lang)}
                      </p>
                    )}
                    {totals.amountToFreeDelivery > 0 && (
                      <p className="text-xs text-[#0E3B22] font-medium mt-1">
                        {t.cart.freeDeliveryHint.replace(
                          '{amount}',
                          formatMad(totals.amountToFreeDelivery, lang)
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[#DCE8DF] space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#516358]">
                    <span>{t.cart.subtotal}</span>
                    <span className="tabular-nums">{formatMad(totals.subtotalMad, lang)}</span>
                  </div>
                  <div className="flex justify-between text-[#516358]">
                    <span>{t.cart.deliveryFee}</span>
                    <span className="tabular-nums">
                      {totals.deliveryFeeMad === 0
                        ? t.cart.freeDelivery
                        : formatMad(totals.deliveryFeeMad, lang)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-[#0F2418] pt-1">
                    <span>{t.cart.total}</span>
                    <span className="tabular-nums">{formatMad(totals.totalMad, lang)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleSubmitOrder} className="bg-white p-4 rounded-xl border border-[#DCE8DF] space-y-3.5">
                <h3 className="font-display text-base font-semibold text-[#0F2418]">
                  {t.cart.checkoutTitle}
                </h3>

                {submitError && (
                  <div className="p-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-xs font-medium">
                    {submitError}
                  </div>
                )}

                <div>
                  <label htmlFor="cart-name" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.cart.fullName} *
                  </label>
                  <input
                    id="cart-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.customerName && (
                    <p className="text-xs text-[#9E2A2B] mt-1">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cart-phone" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.cart.phone} *
                  </label>
                  <input
                    id="cart-phone"
                    type="tel"
                    dir="ltr"
                    placeholder="+212 661 00 00 00"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.customerPhone && (
                    <p className="text-xs text-[#9E2A2B] mt-1">{errors.customerPhone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cart-email" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.cart.emailOptional}
                  </label>
                  <input
                    id="cart-email"
                    type="email"
                    dir="ltr"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-[#9E2A2B] mt-1">{errors.customerEmail}</p>
                  )}
                </div>

                {deliveryMethod === 'delivery' && (
                  <>
                    <div>
                      <label htmlFor="cart-city" className="block text-xs font-medium text-[#4A5D52] mb-1">
                        {t.cart.city} *
                      </label>
                      <input
                        id="cart-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                      />
                      {errors.city && <p className="text-xs text-[#9E2A2B] mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <label htmlFor="cart-address" className="block text-xs font-medium text-[#4A5D52] mb-1">
                        {t.cart.address} *
                      </label>
                      <textarea
                        id="cart-address"
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                      />
                      {errors.address && (
                        <p className="text-xs text-[#9E2A2B] mt-1">{errors.address}</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="cart-notes" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.cart.notes}
                  </label>
                  <input
                    id="cart-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-lg bg-[#0E3B22] hover:bg-[#082716] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {submitting ? t.cart.submitting : t.cart.placeOrder}
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#0E3B22] text-[#0E3B22] hover:bg-[#0E3B22]/5 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.orderWhatsapp}</span>
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
