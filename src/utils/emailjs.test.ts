import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmailJsContactParams,
  buildEmailJsOrderParams,
  buildFormSubmitOrderPayload,
  DEFAULT_RECIPIENT_EMAIL,
  formatOrderItemsForEmailJs,
  resolveEmailJsConfig,
} from './emailjs';
import type { ContactMessage, Order } from '../types';

test('resolves EmailJS configuration with siteContent taking precedence over Vite env', () => {
  const fromEnv = resolveEmailJsConfig(
    { email: 'domaineessaoudi@gmail.com' },
    {
      VITE_EMAILJS_SERVICE_ID: 'service_env123',
      VITE_EMAILJS_TEMPLATE_ID: 'template_env456',
      VITE_EMAILJS_PUBLIC_KEY: 'pub_env789',
    }
  );
  assert.equal(fromEnv.configured, true);
  assert.equal(fromEnv.serviceId, 'service_env123');
  assert.equal(fromEnv.templateId, 'template_env456');
  assert.equal(fromEnv.publicKey, 'pub_env789');
  assert.equal(fromEnv.recipientEmail, DEFAULT_RECIPIENT_EMAIL);

  const fromAdmin = resolveEmailJsConfig(
    {
      email: 'domaineessaoudi@gmail.com',
      emailjsServiceId: 'service_admin',
      emailjsTemplateId: 'template_admin',
      emailjsPublicKey: 'pub_admin',
    },
    {
      VITE_EMAILJS_SERVICE_ID: 'service_env123',
      VITE_EMAILJS_TEMPLATE_ID: 'template_env456',
      VITE_EMAILJS_PUBLIC_KEY: 'pub_env789',
    }
  );
  assert.equal(fromAdmin.configured, true);
  assert.equal(fromAdmin.serviceId, 'service_admin');

  const unconfigured = resolveEmailJsConfig(null, {});
  assert.equal(unconfigured.configured, false);
  assert.equal(unconfigured.recipientEmail, 'domaineessaoudi@gmail.com');
});

test('formats order items and builds EmailJS template params for orders and contacts', () => {
  const order: Order = {
    id: 'ORD-2026-991',
    customer_name: 'Salma Bennani',
    customer_phone: '+212661458812',
    customer_email: 'salma@example.ma',
    city: 'Casablanca',
    delivery_zone: 'casablanca-chaouia',
    address: '14 Rue Maarif, Casablanca',
    delivery_method: 'delivery',
    delivery_fee_mad: 25,
    subtotal_mad: 250,
    total_mad: 275,
    notes: 'Avant midi',
    status: 'pending',
    items: [
      {
        productId: 'oil-beldi-1l',
        variantId: '2l',
        variantLabel: '2 Litres',
        name: 'Huile d’Olive Haouzia Vierge Extra',
        price_mad: 250,
        quantity: 1,
        line_total_mad: 250,
      },
    ],
    created_at: '2026-11-23T10:00:00.000Z',
  };

  const formattedItems = formatOrderItemsForEmailJs(order);
  assert.ok(formattedItems.includes('1 x Huile d’Olive Haouzia Vierge Extra (2 Litres) : 250 MAD'));

  const params = buildEmailJsOrderParams(order, 'domaineessaoudi@gmail.com');
  assert.equal(params.to_email, 'domaineessaoudi@gmail.com');
  assert.equal(params.order_id, 'ORD-2026-991');
  assert.equal(params.total_mad, '275 MAD');
  assert.equal(params.customer_phone, '+212661458812');
  assert.ok(String(params.message).includes('ORD-2026-991'));
  assert.ok(String(params.message).includes('275 MAD'));

  const contactMsg: ContactMessage = {
    id: 'MSG-101',
    name: 'Omar',
    phone: '+212661001122',
    email: 'omar@example.ma',
    subject: 'Commande 10L',
    message: 'Bonjour, je veux 10 litres Haouzia.',
    status: 'unread',
    created_at: '2026-11-23T11:00:00.000Z',
  };
  const contactParams = buildEmailJsContactParams(contactMsg, 'domaineessaoudi@gmail.com');
  assert.equal(contactParams.to_email, 'domaineessaoudi@gmail.com');
  assert.equal(contactParams.from_name, 'Omar');
  assert.ok(contactParams.message.includes('Bonjour, je veux 10 litres Haouzia.'));

  const formSubmitPayload = buildFormSubmitOrderPayload(order);
  assert.equal(formSubmitPayload._template, 'table');
  assert.equal(formSubmitPayload.Reference, 'ORD-2026-991');
  assert.equal(formSubmitPayload.Total, '275 MAD');
  assert.equal(formSubmitPayload.Telephone, '+212661458812');
  assert.equal(formSubmitPayload.Adresse, '14 Rue Maarif, Casablanca');
  assert.ok(formSubmitPayload._subject.includes('ORD-2026-991'));
  assert.ok(formSubmitPayload.Articles.includes('1 x Huile d’Olive Haouzia Vierge Extra (2 Litres) : 250 MAD'));
});
