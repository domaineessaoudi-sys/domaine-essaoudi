import emailjs from '@emailjs/browser';
import type { ContactMessage, Order, SiteContent } from '../types';

export const DEFAULT_RECIPIENT_EMAIL = 'domaineessaoudi@gmail.com';

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  recipientEmail: string;
  configured: boolean;
}

export interface EmailJsEnvSource {
  VITE_EMAILJS_SERVICE_ID?: string;
  VITE_EMAILJS_TEMPLATE_ID?: string;
  VITE_EMAILJS_PUBLIC_KEY?: string;
}

export interface EmailDispatchResult {
  sent: boolean;
  needsActivation?: boolean;
  status: 'sent' | 'pending_emailjs' | 'failed';
  error?: string;
}

function readViteEnv(): EmailJsEnvSource {
  try {
    const metaEnv = (import.meta as unknown as { env?: EmailJsEnvSource })?.env;
    return metaEnv || {};
  } catch {
    return {};
  }
}

export function resolveEmailJsConfig(
  siteContent?: Partial<SiteContent> | null,
  envOverride?: EmailJsEnvSource
): EmailJsConfig {
  const env = envOverride ?? readViteEnv();
  const serviceId = (siteContent?.emailjsServiceId || env.VITE_EMAILJS_SERVICE_ID || '').trim();
  const templateId = (siteContent?.emailjsTemplateId || env.VITE_EMAILJS_TEMPLATE_ID || '').trim();
  const publicKey = (siteContent?.emailjsPublicKey || env.VITE_EMAILJS_PUBLIC_KEY || '').trim();
  const rawEmail = (siteContent?.email || '').trim();
  const recipientEmail =
    rawEmail && rawEmail !== 'contact@domaine-essaoudi.ma'
      ? rawEmail
      : DEFAULT_RECIPIENT_EMAIL;

  return {
    serviceId,
    templateId,
    publicKey,
    recipientEmail,
    configured: Boolean(serviceId && templateId && publicKey),
  };
}

export function formatOrderItemsForEmailJs(order: Order): string {
  return order.items
    .map(
      (item) =>
        `- ${item.quantity} x ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} : ${item.line_total_mad} MAD`
    )
    .join('\n');
}

export function buildEmailJsOrderParams(
  order: Order,
  recipientEmail: string
): Record<string, string | number> {
  const targetEmail = recipientEmail.trim() || DEFAULT_RECIPIENT_EMAIL;
  const deliveryLabel =
    order.delivery_method === 'pickup'
      ? 'Retrait à la ferme (Berrechid)'
      : 'Livraison à domicile';
  const itemsSummary = formatOrderItemsForEmailJs(order);

  const fullMessage = [
    `Nouvelle commande Domaine Essaoudi`,
    `Référence : ${order.id}`,
    `Date : ${order.created_at}`,
    ``,
    `Client : ${order.customer_name}`,
    `Téléphone : ${order.customer_phone}`,
    order.customer_email ? `Email client : ${order.customer_email}` : '',
    `Mode : ${deliveryLabel}`,
    `Ville : ${order.city}`,
    `Adresse : ${order.address}`,
    order.notes ? `Notes : ${order.notes}` : '',
    ``,
    `Articles commandés :`,
    itemsSummary,
    ``,
    `Sous-total : ${order.subtotal_mad} MAD`,
    `Livraison : ${order.delivery_fee_mad === 0 ? 'Gratuite' : `${order.delivery_fee_mad} MAD`}`,
    `TOTAL À PAYER : ${order.total_mad} MAD`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    to_email: targetEmail,
    to_name: 'Domaine Essaoudi',
    from_name: order.customer_name,
    reply_to: order.customer_email || targetEmail,
    subject: `Nouvelle Commande ${order.id} — ${order.customer_name} (${order.total_mad} MAD)`,
    order_id: order.id,
    order_date: order.created_at,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || '—',
    delivery_method: deliveryLabel,
    city: order.city,
    address: order.address,
    notes: order.notes || 'Aucune',
    items_summary: itemsSummary,
    subtotal_mad: `${order.subtotal_mad} MAD`,
    delivery_fee_mad: order.delivery_fee_mad === 0 ? 'Gratuite (0 MAD)' : `${order.delivery_fee_mad} MAD`,
    total_mad: `${order.total_mad} MAD`,
    message: fullMessage,
  };
}

export function buildEmailJsContactParams(
  msg: ContactMessage,
  recipientEmail: string
): Record<string, string> {
  const targetEmail = recipientEmail.trim() || DEFAULT_RECIPIENT_EMAIL;
  const fullMessage = [
    `Message reçu via Domaine Essaoudi`,
    `Nom : ${msg.name}`,
    `Téléphone : ${msg.phone}`,
    msg.email ? `Email : ${msg.email}` : '',
    `Objet : ${msg.subject}`,
    ``,
    msg.message,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    to_email: targetEmail,
    to_name: 'Domaine Essaoudi',
    from_name: msg.name,
    reply_to: msg.email || targetEmail,
    subject: `[Contact] ${msg.subject} — ${msg.name}`,
    order_id: msg.id,
    customer_name: msg.name,
    customer_phone: msg.phone,
    customer_email: msg.email || '—',
    items_summary: msg.subject,
    total_mad: 'Contact',
    message: fullMessage,
  };
}

export function buildFormSubmitOrderPayload(order: Order): Record<string, string> {
  const deliveryLabel =
    order.delivery_method === 'pickup'
      ? 'Retrait à la ferme (Berrechid)'
      : 'Livraison à domicile';

  return {
    name: order.customer_name,
    email: order.customer_email || DEFAULT_RECIPIENT_EMAIL,
    _subject: `Nouvelle Commande ${order.id} — ${order.customer_name} (${order.total_mad} MAD)`,
    _template: 'table',
    _captcha: 'false',
    Reference: order.id,
    Client: order.customer_name,
    Telephone: order.customer_phone,
    Mode: deliveryLabel,
    Ville: order.city,
    Adresse: order.address,
    Articles: formatOrderItemsForEmailJs(order),
    Sous_total: `${order.subtotal_mad} MAD`,
    Livraison: order.delivery_fee_mad === 0 ? 'Gratuite' : `${order.delivery_fee_mad} MAD`,
    Total: `${order.total_mad} MAD`,
    Notes: order.notes || 'Aucune',
  };
}

export async function sendOrderViaEmailJS(
  order: Order,
  config: EmailJsConfig
): Promise<EmailDispatchResult> {
  if (!config.configured) {
    return {
      sent: false,
      status: 'pending_emailjs',
      error: 'EmailJS Service ID, Template ID, and Public Key are not configured yet.',
    };
  }

  try {
    const params = buildEmailJsOrderParams(order, config.recipientEmail);
    await emailjs.send(config.serviceId, config.templateId, params, {
      publicKey: config.publicKey,
    });
    return { sent: true, status: 'sent' };
  } catch (err) {
    const message =
      typeof err === 'object' && err !== null && 'text' in err
        ? String((err as { text: unknown }).text)
        : err instanceof Error
          ? err.message
          : 'EmailJS dispatch failed';
    return { sent: false, status: 'failed', error: message };
  }
}

export async function sendOrderViaFormSubmit(
  order: Order,
  recipientEmail: string
): Promise<EmailDispatchResult> {
  const target = (recipientEmail || DEFAULT_RECIPIENT_EMAIL).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return { sent: false, status: 'failed', error: 'Invalid recipient email' };
  }

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(buildFormSubmitOrderPayload(order)),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean | string;
      message?: string;
    };
    const isSuccess = data.success === true || data.success === 'true';
    if (isSuccess) {
      return { sent: true, status: 'sent' };
    }
    const msg = String(data.message || '');
    const needsActivation = /activat/i.test(msg);
    return {
      sent: false,
      needsActivation,
      status: 'pending_emailjs',
      error: msg || 'Email confirmation required',
    };
  } catch (err) {
    return {
      sent: false,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Email request failed',
    };
  }
}

export async function sendContactViaEmailJS(
  msg: ContactMessage,
  config: EmailJsConfig
): Promise<{ sent: boolean; error?: string }> {
  if (!config.configured) {
    return { sent: false, error: 'EmailJS is not configured.' };
  }
  try {
    const params = buildEmailJsContactParams(msg, config.recipientEmail);
    await emailjs.send(config.serviceId, config.templateId, params, {
      publicKey: config.publicKey,
    });
    return { sent: true };
  } catch (err) {
    const message =
      typeof err === 'object' && err !== null && 'text' in err
        ? String((err as { text: unknown }).text)
        : err instanceof Error
          ? err.message
          : 'EmailJS contact dispatch failed';
    return { sent: false, error: message };
  }
}

export async function sendContactViaFormSubmit(
  msg: ContactMessage,
  recipientEmail: string
): Promise<EmailDispatchResult> {
  const target = (recipientEmail || DEFAULT_RECIPIENT_EMAIL).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return { sent: false, status: 'failed', error: 'Invalid recipient email' };
  }
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: msg.name,
        email: msg.email || DEFAULT_RECIPIENT_EMAIL,
        _subject: `[Contact Domaine Essaoudi] ${msg.subject} — ${msg.name}`,
        _template: 'table',
        _captcha: 'false',
        Nom: msg.name,
        Telephone: msg.phone,
        Email: msg.email || '—',
        Objet: msg.subject,
        Message: msg.message,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean | string;
      message?: string;
    };
    const isSuccess = data.success === true || data.success === 'true';
    if (isSuccess) {
      return { sent: true, status: 'sent' };
    }
    const text = String(data.message || '');
    return {
      sent: false,
      needsActivation: /activat/i.test(text),
      status: 'pending_emailjs',
      error: text || 'Email confirmation required',
    };
  } catch (err) {
    return {
      sent: false,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Email request failed',
    };
  }
}
