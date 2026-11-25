import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createContactMessage,
  createOrderRecord,
  createProduct,
  deleteOrder,
  deleteProduct,
  getAdminStats,
  getProductByIdOrSlug,
  getSiteContent,
  listContactMessages,
  listOrders,
  listProducts,
  updateContactMessageStatus,
  updateOrderEmailStatus,
  updateOrderStatus,
  updateProduct,
  updateSiteContent,
} from './server/db';
import {
  getEmailJsServerConfig,
  getSmtpConfig,
  resolveOrderRecipientEmail,
  sendContactNotificationEmail,
  sendOrderNotificationEmail,
} from './server/mailer';
import {
  claimInitialAdminPassword,
  extractBearerToken,
  getAuthConfigurationStatus,
  issueAdminSession,
  requireAdmin,
  revokeSessionToken,
  signOrderReceipt,
  verifyAdminPassword,
  verifyOrderReceipt,
  verifySessionToken,
} from './server/auth';
import {
  calculateDeliveryFee,
  isValidMoroccanPhone,
  normalizeMoroccanPhone,
} from './src/utils/commerce';
import {
  clearSupabaseConfig,
  executeSqlQuery,
  exportSupabaseFullSql,
  getPublicSupabaseStatus,
  pushSchemaAndDataToSupabase,
  saveSupabaseConfig,
  testSupabaseConnection,
} from './server/supabase';
import type { OrderItemPayload, OrderItemSummary, OrderStatus } from './src/types';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const uploadsDir = process.env.VERCEL
  ? path.resolve('/tmp', 'uploads')
  : path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    // Ignore error in serverless environment
  }
}

app.use(express.json({ limit: '5mb' }));

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/') || trimmed.startsWith('/uploads/')) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Serve uploaded product images with strict path confinement
app.get('/uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const resolved = path.resolve(uploadsDir, safeName);
  if (!resolved.startsWith(uploadsDir + path.sep) || !fs.existsSync(resolved)) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  res.sendFile(resolved);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'domaine-essaoudi', database: 'supabase' });
});

// Public Storefront Routes
app.get('/api/products', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const featured = req.query.featured === '1';
    const includeUnavailable =
      req.query.includeUnavailable === '1' && verifySessionToken(extractBearerToken(req));
    const products = await listProducts({ category, featured, includeUnavailable });
    res.json({ products });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load products.',
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getProductByIdOrSlug(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load product.',
    });
  }
});

app.get('/api/content', async (_req, res) => {
  try {
    const content = await getSiteContent();
    res.json({ content });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load site content.',
    });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body || {};
    const customerName = String(body.customer_name || '').trim();
    const customerPhoneRaw = String(body.customer_phone || '').trim();
    const customerEmail = String(body.customer_email || '').trim();
    const city = String(body.city || '').trim();
    const deliveryZoneId = String(body.delivery_zone || '').trim();
    const address = String(body.address || '').trim();
    const deliveryMethod = body.delivery_method === 'pickup' ? 'pickup' : 'delivery';
    const notes = String(body.notes || '').trim().slice(0, 500);
    const rawItems: OrderItemPayload[] = Array.isArray(body.items) ? body.items : [];

    if (customerName.length < 2 || customerName.length > 100) {
      res.status(400).json({ error: 'Valid full name is required.' });
      return;
    }
    if (!isValidMoroccanPhone(customerPhoneRaw)) {
      res.status(400).json({ error: 'Valid Moroccan phone number (+212...) is required.' });
      return;
    }
    if (deliveryMethod === 'delivery' && (city.length < 2 || address.length < 5)) {
      res.status(400).json({ error: 'City and full delivery address are required for delivery.' });
      return;
    }
    if (rawItems.length === 0 || rawItems.length > 50) {
      res.status(400).json({ error: 'Cart cannot be empty.' });
      return;
    }

    const verifiedItems: OrderItemSummary[] = [];
    let subtotalMad = 0;

    for (const item of rawItems) {
      const qty = Math.floor(Number(item.quantity));
      if (!item.productId || !Number.isFinite(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: 'Invalid item quantity in order.' });
        return;
      }
      const product = await getProductByIdOrSlug(String(item.productId));
      if (!product || !product.available) {
        res.status(400).json({ error: `Product unavailable: ${item.productId}` });
        return;
      }

      let unitPrice = product.price_mad;
      let variantLabel: string | undefined;
      let availableStock = product.stock;

      if (item.variantId && product.variants.length > 0) {
        const foundVariant = product.variants.find((v) => v.id === item.variantId);
        if (foundVariant) {
          unitPrice = foundVariant.price_mad;
          variantLabel = foundVariant.label_fr;
          availableStock = Math.min(product.stock, foundVariant.stock);
        }
      }

      if (availableStock < qty) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name_fr}. Available: ${availableStock}`,
        });
        return;
      }

      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      subtotalMad += lineTotal;

      verifiedItems.push({
        productId: product.id,
        variantId: item.variantId,
        variantLabel,
        name: product.name_fr,
        price_mad: unitPrice,
        quantity: qty,
        line_total_mad: lineTotal,
      });
    }

    subtotalMad = Math.round(subtotalMad * 100) / 100;
    const content = await getSiteContent();
    const zone = content.deliveryZones.find((z) => z.id === deliveryZoneId) || content.deliveryZones[0];
    const deliveryFeeMad = calculateDeliveryFee(subtotalMad, zone, deliveryMethod);
    const totalMad = Math.round((subtotalMad + deliveryFeeMad) * 100) / 100;

    const order = await createOrderRecord({
      customer_name: customerName,
      customer_phone: normalizeMoroccanPhone(customerPhoneRaw),
      customer_email: customerEmail,
      city: deliveryMethod === 'pickup' ? 'Berrechid (Ferme)' : city,
      delivery_zone: deliveryMethod === 'pickup' ? 'pickup' : zone.id,
      address:
        deliveryMethod === 'pickup'
          ? 'Retrait direct Domaine Essaoudi, Douar Ouled Ziane'
          : address,
      delivery_method: deliveryMethod,
      delivery_fee_mad: deliveryFeeMad,
      subtotal_mad: subtotalMad,
      total_mad: totalMad,
      notes,
      items: verifiedItems,
    });

    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const mailResult = await sendOrderNotificationEmail(order, recipientEmail);
    const finalOrder =
      (await updateOrderEmailStatus(order.id, mailResult.status, mailResult.recipient)) || order;
    const receiptProof = signOrderReceipt(order.id);
    const ejServer = getEmailJsServerConfig();

    res.status(201).json({
      order: finalOrder,
      receiptProof,
      emailjs: {
        serviceId: (content.emailjsServiceId || ejServer.serviceId || '').trim(),
        templateId: (content.emailjsTemplateId || ejServer.templateId || '').trim(),
        publicKey: (content.emailjsPublicKey || ejServer.publicKey || '').trim(),
        recipientEmail,
      },
      emailNotification: {
        sent: mailResult.sent,
        status: mailResult.status,
        recipient: mailResult.recipient,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to create order.',
    });
  }
});

app.post('/api/orders/:id/email-status', async (req, res) => {
  try {
    const orderId = String(req.params.id || '').trim();
    const receiptProof = String(req.body?.receiptProof || '');
    const status = req.body?.status;

    if (!verifyOrderReceipt(orderId, receiptProof)) {
      res.status(403).json({ error: 'Invalid order receipt proof.' });
      return;
    }
    if (status !== 'sent' && status !== 'failed') {
      res.status(400).json({ error: 'Invalid email delivery status.' });
      return;
    }

    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const updated = await updateOrderEmailStatus(orderId, status, recipientEmail);
    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: updated });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to update email status.',
    });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    if (name.length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Name is required (min 2 characters).' });
      return;
    }
    if (!isValidMoroccanPhone(phone)) {
      res.status(400).json({ error: 'Valid Moroccan phone number (+212...) is required.' });
      return;
    }
    if (subject.length < 2 || message.length < 5) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }

    const saved = await createContactMessage({
      name,
      phone: normalizeMoroccanPhone(phone),
      email,
      subject: subject.slice(0, 140),
      message: message.slice(0, 2000),
    });
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    void sendContactNotificationEmail(saved, recipientEmail);
    res.status(201).json({ message: saved });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to save contact message.',
    });
  }
});

// Admin Authentication Routes
app.get('/api/admin/auth-status', (req, res) => {
  const status = getAuthConfigurationStatus();
  const authenticated = verifySessionToken(extractBearerToken(req));
  res.json({
    configured: status.envConfigured || status.claimed,
    envConfigured: status.envConfigured,
    claimed: status.claimed,
    authenticated,
  });
});

app.post('/api/admin/claim', (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 6 || password.length > 128) {
    res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
    return;
  }
  const ok = claimInitialAdminPassword(password);
  if (!ok) {
    res.status(409).json({ error: 'Administrator password is already configured.' });
    return;
  }
  const token = issueAdminSession();
  res.status(201).json({ token });
});

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!password) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ error: 'Invalid administrator password.' });
    return;
  }
  const token = issueAdminSession();
  res.json({ token });
});

app.post('/api/admin/logout', (req, res) => {
  revokeSessionToken(extractBearerToken(req));
  res.json({ ok: true });
});

// Protected Admin Routes
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load admin statistics.',
    });
  }
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  const dataUrl = String(req.body?.dataUrl || '');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: 'Invalid image format. Only JPEG, PNG, and WebP are allowed.' });
    return;
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 3 * 1024 * 1024) {
    res.status(400).json({ error: 'Image size exceeds 3 MB limit.' });
    return;
  }

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `product-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const target = path.resolve(uploadsDir, filename);
  if (!target.startsWith(uploadsDir + path.sep)) {
    res.status(400).json({ error: 'Invalid upload path.' });
    return;
  }
  fs.writeFileSync(target, buffer);
  res.status(201).json({ url: `/uploads/${filename}` });
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const category = b.category;
    if (!['vegetables', 'olive-oil', 'poultry'].includes(category)) {
      res.status(400).json({ error: 'Valid category is required.' });
      return;
    }
    const nameFr = String(b.name_fr || '').trim();
    const nameEn = String(b.name_en || nameFr).trim();
    const nameAr = String(b.name_ar || nameFr).trim();
    const priceMad = Number(b.price_mad);
    const stock = Math.max(0, Math.floor(Number(b.stock ?? 0)));
    const imageUrl = String(
      b.image_url || '/src/assets/images/cat_fresh_vegetables_1795435654556.jpg'
    ).trim();

    if (!nameFr || !Number.isFinite(priceMad) || priceMad <= 0) {
      res.status(400).json({ error: 'Product name and positive price in MAD are required.' });
      return;
    }
    if (!isSafeImageUrl(imageUrl)) {
      res.status(400).json({ error: 'Invalid image URL.' });
      return;
    }

    const created = await createProduct({
      category,
      subcategory: String(b.subcategory || 'general').trim(),
      name_fr: nameFr,
      name_en: nameEn,
      name_ar: nameAr,
      desc_fr: String(b.desc_fr || '').trim(),
      desc_en: String(b.desc_en || '').trim(),
      desc_ar: String(b.desc_ar || '').trim(),
      price_mad: Math.round(priceMad * 100) / 100,
      unit_fr: String(b.unit_fr || '1 kg').trim(),
      unit_en: String(b.unit_en || '1 kg').trim(),
      unit_ar: String(b.unit_ar || '1 كغ').trim(),
      stock,
      available: b.available !== false,
      featured: Boolean(b.featured),
      image_url: imageUrl,
      variants: Array.isArray(b.variants) ? b.variants : [],
      harvest_note_fr: String(b.harvest_note_fr || '').trim(),
      harvest_note_en: String(b.harvest_note_en || '').trim(),
      harvest_note_ar: String(b.harvest_note_ar || '').trim(),
    });
    res.status(201).json({ product: created });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to create product.',
    });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    if (b.image_url !== undefined && !isSafeImageUrl(String(b.image_url))) {
      res.status(400).json({ error: 'Invalid image URL.' });
      return;
    }
    if (b.price_mad !== undefined && (!Number.isFinite(Number(b.price_mad)) || Number(b.price_mad) <= 0)) {
      res.status(400).json({ error: 'Price must be positive.' });
      return;
    }
    const updated = await updateProduct(req.params.id, {
      ...b,
      price_mad: b.price_mad !== undefined ? Math.round(Number(b.price_mad) * 100) / 100 : undefined,
      stock: b.stock !== undefined ? Math.max(0, Math.floor(Number(b.stock))) : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to update product.',
    });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to delete product.',
    });
  }
});

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  try {
    const orders = await listOrders();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load orders.',
    });
  }
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const status = req.body?.status as OrderStatus;
    if (!['pending', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }
    const updated = await updateOrderStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ order: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to update order status.',
    });
  }
});

app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to delete order.',
    });
  }
});

app.put('/api/admin/content', requireAdmin, async (req, res) => {
  try {
    const body = { ...(req.body || {}) };
    if (typeof body.emailjsServiceId === 'string') {
      body.emailjsServiceId = body.emailjsServiceId.trim().slice(0, 120);
    }
    if (typeof body.emailjsTemplateId === 'string') {
      body.emailjsTemplateId = body.emailjsTemplateId.trim().slice(0, 120);
    }
    if (typeof body.emailjsPublicKey === 'string') {
      body.emailjsPublicKey = body.emailjsPublicKey.trim().slice(0, 120);
    }
    if (typeof body.email === 'string') {
      body.email = body.email.trim().slice(0, 160);
    }
    const updated = await updateSiteContent(body);
    res.json({ content: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to save site content.',
    });
  }
});

app.get('/api/admin/email-status', requireAdmin, async (_req, res) => {
  try {
    const smtpCfg = getSmtpConfig();
    const ejCfg = getEmailJsServerConfig();
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const serviceId = (content.emailjsServiceId || ejCfg.serviceId || '').trim();
    const templateId = (content.emailjsTemplateId || ejCfg.templateId || '').trim();
    const publicKey = (content.emailjsPublicKey || ejCfg.publicKey || '').trim();
    const emailjsConfigured = Boolean(serviceId && templateId && publicKey);

    res.json({
      configured: emailjsConfigured || smtpCfg.configured,
      emailjsConfigured,
      smtpConfigured: smtpCfg.configured,
      emailjsServiceId: serviceId,
      emailjsTemplateId: templateId,
      smtpHost: smtpCfg.host || 'smtp.gmail.com',
      smtpPort: smtpCfg.port,
      smtpUser: smtpCfg.user ? `${smtpCfg.user.slice(0, 3)}***` : '',
      recipientEmail,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to check email status.',
    });
  }
});

app.post('/api/admin/test-email', requireAdmin, async (_req, res) => {
  try {
    const content = await getSiteContent();
    const recipientEmail = resolveOrderRecipientEmail(content.email);
    const testOrder = {
      id: `TEST-${Date.now().toString().slice(-6)}`,
      customer_name: 'Test Domaine Essaoudi',
      customer_phone: '+212654538595',
      customer_email: recipientEmail,
      city: 'Berrechid',
      delivery_zone: 'casablanca-chaouia',
      address: 'Douar Ouled Ziane, Route de Berrechid',
      delivery_method: 'delivery' as const,
      delivery_fee_mad: 0,
      subtotal_mad: 250,
      total_mad: 250,
      notes: 'Test de réception des commandes par email',
      status: 'pending' as const,
      items: [
        {
          productId: 'oil-beldi-1l',
          variantId: '5l',
          variantLabel: '5 Litres',
          name: 'Huile d’Olive Haouzia Vierge Extra',
          price_mad: 250,
          quantity: 1,
          line_total_mad: 250,
        },
      ],
      created_at: new Date().toISOString(),
    };

    const result = await sendOrderNotificationEmail(testOrder, recipientEmail);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to send test email.',
    });
  }
});

app.get('/api/admin/messages', requireAdmin, async (_req, res) => {
  try {
    const messages = await listContactMessages();
    res.json({ messages });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to load contact messages.',
    });
  }
});

app.patch('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!['unread', 'read', 'replied'].includes(status)) {
      res.status(400).json({ error: 'Invalid message status.' });
      return;
    }
    const updated = await updateContactMessageStatus(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    res.json({ message: updated });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to update contact message status.',
    });
  }
});

// Protected Supabase & SQL Editor Routes
app.get('/api/admin/supabase/config', requireAdmin, (_req, res) => {
  res.json({ supabase: getPublicSupabaseStatus() });
});

app.put('/api/admin/supabase/config', requireAdmin, (req, res) => {
  const b = req.body || {};
  const result = saveSupabaseConfig({
    projectUrl: typeof b.projectUrl === 'string' ? b.projectUrl : undefined,
    anonKey: typeof b.anonKey === 'string' ? b.anonKey : undefined,
    serviceRoleKey: typeof b.serviceRoleKey === 'string' ? b.serviceRoleKey : undefined,
    postgresUri: typeof b.postgresUri === 'string' ? b.postgresUri : undefined,
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error || 'Configuration Supabase invalide.' });
    return;
  }
  res.json({ supabase: result.status });
});

app.post('/api/admin/supabase/disconnect', requireAdmin, (_req, res) => {
  res.json({ supabase: clearSupabaseConfig() });
});

app.post('/api/admin/supabase/test', requireAdmin, async (_req, res) => {
  const result = await testSupabaseConnection();
  res.status(result.ok ? 200 : 400).json(result);
});

app.post('/api/admin/supabase/sync', requireAdmin, async (_req, res) => {
  try {
    const result = await pushSchemaAndDataToSupabase();
    res.json(result);
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur de synchronisation Supabase.',
    });
  }
});

app.get('/api/admin/supabase/export-sql', requireAdmin, async (_req, res) => {
  try {
    const sql = await exportSupabaseFullSql();
    res.json({ sql });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur lors de la génération du script SQL.',
    });
  }
});

app.post('/api/admin/sql/execute', requireAdmin, async (req, res) => {
  const sql = typeof req.body?.sql === 'string' ? req.body.sql : '';
  try {
    const result = await executeSqlQuery({ target: 'supabase', sql });
    res.json({ result });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Erreur lors de l’exécution SQL.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Domaine Essaoudi server running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
export { app };
