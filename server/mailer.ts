import nodemailer from 'nodemailer';
import type { ContactMessage, Order } from '../src/types';
import {
  buildEmailJsContactParams,
  buildEmailJsOrderParams,
} from '../src/utils/emailjs';

export const DEFAULT_ORDER_EMAIL = 'domaineessaoudi@gmail.com';

export interface MailDeliveryResult {
  sent: boolean;
  status: 'sent' | 'pending_smtp' | 'pending_emailjs' | 'failed';
  recipient: string;
  messageId?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolveOrderRecipientEmail(siteEmail?: string): string {
  const envRecipient = (process.env.ORDER_NOTIFICATION_EMAIL || '').trim();
  if (envRecipient) return envRecipient;
  const trimmed = (siteEmail || '').trim();
  if (trimmed && trimmed !== 'contact@domaine-essaoudi.ma') return trimmed;
  return DEFAULT_ORDER_EMAIL;
}

export function getEmailJsServerConfig() {
  const serviceId = (process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '').trim();
  const templateId = (process.env.EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '').trim();
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.EMAILJS_PRIVATE_KEY || '').trim();

  return {
    serviceId,
    templateId,
    publicKey,
    privateKey,
    browserReady: Boolean(serviceId && templateId && publicKey),
    serverRestConfigured: Boolean(serviceId && templateId && publicKey && privateKey),
  };
}

export function getSmtpConfig() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const host = (process.env.SMTP_HOST || (user ? 'smtp.gmail.com' : '')).trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const from = (process.env.SMTP_FROM || (user ? `Domaine Essaoudi <${user}>` : '')).trim();

  return {
    configured: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

async function sendViaEmailJsRest(
  templateParams: Record<string, string | number>,
  recipient: string
): Promise<MailDeliveryResult | null> {
  const ej = getEmailJsServerConfig();
  if (!ej.serverRestConfigured) {
    return null;
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: ej.serviceId,
        template_id: ej.templateId,
        user_id: ej.publicKey,
        accessToken: ej.privateKey,
        template_params: templateParams,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'EmailJS REST error');
      return {
        sent: false,
        status: 'failed',
        recipient,
        error: errText,
      };
    }
    return {
      sent: true,
      status: 'sent',
      recipient,
      messageId: 'emailjs-rest',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'EmailJS request failed';
    return {
      sent: false,
      status: 'failed',
      recipient,
      error: message,
    };
  }
}

function createTransport() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

export async function sendOrderNotificationEmail(
  order: Order,
  recipientEmail: string
): Promise<MailDeliveryResult> {
  const target = recipientEmail.trim() || DEFAULT_ORDER_EMAIL;

  // 1. Try server-side EmailJS REST API if EMAILJS_PRIVATE_KEY is configured
  const emailJsResult = await sendViaEmailJsRest(
    buildEmailJsOrderParams(order, target),
    target
  );
  if (emailJsResult) {
    return emailJsResult;
  }

  // 2. Fallback to SMTP if configured, otherwise leave ready for browser EmailJS
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return {
      sent: false,
      status: 'pending_emailjs',
      recipient: target,
      error: 'Configure EmailJS Service ID, Template ID & Public Key in Admin or Secrets.',
    };
  }

  const transport = createTransport();
  if (!transport) {
    return {
      sent: false,
      status: 'pending_emailjs',
      recipient: target,
    };
  }

  const itemLinesText = order.items
    .map(
      (i) =>
        `- ${i.quantity}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} : ${i.line_total_mad} MAD`
    )
    .join('\n');

  const itemRowsHtml = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;">${i.quantity} × ${escapeHtml(i.name)}${i.variantLabel ? ` <span style="color:#4a5d52;">(${escapeHtml(i.variantLabel)})</span>` : ''}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">${i.price_mad} MAD</td>
          <td style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;font-weight:700;">${i.line_total_mad} MAD</td>
        </tr>
      `
    )
    .join('');

  const subject = `Nouvelle Commande ${order.id} — ${order.customer_name} (${order.total_mad} MAD)`;

  const text = [
    `Nouvelle commande reçue sur Domaine Essaoudi`,
    `Référence : ${order.id}`,
    `Date : ${order.created_at}`,
    ``,
    `CLIENT`,
    `Nom : ${order.customer_name}`,
    `Téléphone : ${order.customer_phone}`,
    order.customer_email ? `Email client : ${order.customer_email}` : '',
    `Mode : ${order.delivery_method === 'pickup' ? 'Retrait à la ferme' : 'Livraison'}`,
    `Ville : ${order.city}`,
    `Adresse : ${order.address}`,
    order.notes ? `Notes : ${order.notes}` : '',
    ``,
    `ARTICLES`,
    itemLinesText,
    ``,
    `Sous-total : ${order.subtotal_mad} MAD`,
    `Frais de livraison : ${order.delivery_fee_mad} MAD`,
    `TOTAL À PAYER : ${order.total_mad} MAD`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f2418;background:#f7faf7;padding:24px;border-radius:12px;">
      <div style="background:#0e3b22;color:#ffffff;padding:18px 22px;border-radius:10px 10px 0 0;">
        <h2 style="margin:0;font-size:18px;">Nouvelle Commande — Domaine Essaoudi</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#c7ddd0;">Réf : ${escapeHtml(order.id)}</p>
      </div>
      <div style="background:#ffffff;padding:20px 22px;border:1px solid #dce8df;border-top:none;border-radius:0 0 10px 10px;">
        <p style="margin:0 0 12px;font-size:14px;">
          <strong>Client :</strong> ${escapeHtml(order.customer_name)}<br/>
          <strong>Téléphone :</strong> <a href="tel:${escapeHtml(order.customer_phone)}">${escapeHtml(order.customer_phone)}</a><br/>
          ${order.customer_email ? `<strong>Email client :</strong> ${escapeHtml(order.customer_email)}<br/>` : ''}
          <strong>Mode :</strong> ${order.delivery_method === 'pickup' ? 'Retrait à la ferme' : 'Livraison à domicile'}<br/>
          <strong>Ville :</strong> ${escapeHtml(order.city)}<br/>
          <strong>Adresse :</strong> ${escapeHtml(order.address)}<br/>
          ${order.notes ? `<strong>Notes :</strong> ${escapeHtml(order.notes)}<br/>` : ''}
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead>
            <tr style="background:#f3f8f4;text-align:left;">
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;">Produit</th>
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">Prix</th>
              <th style="padding:8px 10px;border-bottom:1px solid #dce8df;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        <div style="text-align:right;font-size:14px;line-height:1.7;">
          <div>Sous-total : <strong>${order.subtotal_mad} MAD</strong></div>
          <div>Livraison : <strong>${order.delivery_fee_mad === 0 ? 'Gratuite' : `${order.delivery_fee_mad} MAD`}</strong></div>
          <div style="font-size:17px;color:#0e3b22;margin-top:4px;">Total : <strong>${order.total_mad} MAD</strong></div>
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to: target,
      replyTo: order.customer_email || undefined,
      subject,
      text,
      html,
    });
    return {
      sent: true,
      status: 'sent',
      recipient: target,
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP delivery failed';
    console.error('[mailer] Order email error:', message);
    return {
      sent: false,
      status: 'failed',
      recipient: target,
      error: message,
    };
  }
}

export async function sendContactNotificationEmail(
  msg: ContactMessage,
  recipientEmail: string
): Promise<MailDeliveryResult> {
  const target = recipientEmail.trim() || DEFAULT_ORDER_EMAIL;

  const emailJsResult = await sendViaEmailJsRest(
    buildEmailJsContactParams(msg, target),
    target
  );
  if (emailJsResult) {
    return emailJsResult;
  }

  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    return { sent: false, status: 'pending_emailjs', recipient: target };
  }
  const transport = createTransport();
  if (!transport) {
    return { sent: false, status: 'pending_emailjs', recipient: target };
  }

  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to: target,
      replyTo: msg.email || undefined,
      subject: `[Contact Domaine Essaoudi] ${msg.subject} — ${msg.name}`,
      text: `De : ${msg.name}\nTéléphone : ${msg.phone}\nEmail : ${msg.email || '—'}\nSujet : ${msg.subject}\n\n${msg.message}`,
    });
    return { sent: true, status: 'sent', recipient: target, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP delivery failed';
    console.error('[mailer] Contact email error:', message);
    return { sent: false, status: 'failed', recipient: target, error: message };
  }
}
