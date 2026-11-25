import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Lock,
  LogOut,
  Mail,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  AdminStats,
  ContactMessage,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  SiteContent,
} from '../types';
import { formatMad, getLocalizedField } from '../utils/commerce';
import {
  resolveEmailJsConfig,
  sendOrderViaEmailJS,
  sendOrderViaFormSubmit,
} from '../utils/emailjs';
import { ResilientImage } from '../components/ResilientImage';
import { AdminSqlEditor } from '../components/AdminSqlEditor';

const PRESET_IMAGES = [
  {
    label: 'Légumes / Vegetables',
    url: '/src/assets/images/cat_fresh_vegetables_1795435654556.jpg',
  },
  {
    label: "Huile d'Olive Beldi",
    url: '/src/assets/images/cat_olive_oil_beldi_1795435654212.jpg',
  },
  {
    label: 'Poulet Beldi',
    url: '/src/assets/images/cat_poulet_beldi_1795435654032.jpg',
  },
  {
    label: 'Œufs Beldi',
    url: '/src/assets/images/cat_oeufs_beldi_1795614759676.jpg',
  },
];

type AdminTab = 'overview' | 'products' | 'orders' | 'content' | 'sql';

interface EmailStatusInfo {
  configured: boolean;
  emailjsConfigured?: boolean;
  smtpConfigured?: boolean;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  recipientEmail: string;
}

interface ProductFormState {
  id?: string;
  category: ProductCategory;
  subcategory: string;
  name_fr: string;
  name_en: string;
  name_ar: string;
  desc_fr: string;
  desc_en: string;
  desc_ar: string;
  price_mad: string;
  unit_fr: string;
  unit_en: string;
  unit_ar: string;
  stock: string;
  available: boolean;
  featured: boolean;
  image_url: string;
  harvest_note_fr: string;
  harvest_note_en: string;
  harvest_note_ar: string;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  category: 'vegetables',
  subcategory: 'seasonal',
  name_fr: '',
  name_en: '',
  name_ar: '',
  desc_fr: '',
  desc_en: '',
  desc_ar: '',
  price_mad: '25',
  unit_fr: '1 kg',
  unit_en: '1 kg',
  unit_ar: '1 كغ',
  stock: '20',
  available: true,
  featured: false,
  image_url: PRESET_IMAGES[0].url,
  harvest_note_fr: '',
  harvest_note_en: '',
  harvest_note_ar: '',
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-sky-100 text-sky-900',
  preparing: 'bg-indigo-100 text-indigo-900',
  shipped: 'bg-emerald-100 text-emerald-900',
  completed: 'bg-[#0E3B22]/15 text-[#082716]',
  cancelled: 'bg-red-100 text-red-900',
};

export function AdminPage() {
  const {
    lang,
    t,
    adminToken,
    setAdminToken,
    refreshProducts,
    siteContent,
    refreshSiteContent,
    showToast,
  } = useApp();

  const [authChecking, setAuthChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [adminDbError, setAdminDbError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  const [contentForm, setContentForm] = useState<SiteContent | null>(siteContent);
  const [savingContent, setSavingContent] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatusInfo | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    sent: boolean;
    recipient: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (siteContent) setContentForm(siteContent);
  }, [siteContent]);

  const checkAuthStatus = useCallback(async () => {
    setAuthChecking(true);
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
      const res = await fetch('/api/admin/auth-status', { headers });
      if (res.ok) {
        const data = await res.json();
        setConfigured(Boolean(data.configured));
        if (adminToken && !data.authenticated) {
          setAdminToken(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setAuthChecking(false);
    }
  }, [adminToken, setAdminToken]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const loadAdminWorkspace = useCallback(async () => {
    if (!adminToken) return;
    setLoadingData(true);
    setAdminDbError(null);
    const headers = { Authorization: `Bearer ${adminToken}` };
    try {
      const [statsRes, prodRes, ordRes, msgRes, emailRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/products?includeUnavailable=1', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/messages', { headers }),
        fetch('/api/admin/email-status', { headers }),
      ]);

      if (statsRes.status === 401) {
        setAdminToken(null);
        return;
      }

      let firstError: string | null = null;

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.stats);
      } else {
        const errBody = await statsRes.json().catch(() => ({}));
        firstError = firstError || errBody.error || `Erreur Supabase (${statsRes.status})`;
      }

      if (prodRes.ok) {
        const p = await prodRes.json();
        setAdminProducts(p.products || []);
      } else {
        const errBody = await prodRes.json().catch(() => ({}));
        firstError = firstError || errBody.error || `Erreur Produits (${prodRes.status})`;
      }

      if (ordRes.ok) {
        const o = await ordRes.json();
        setOrders(o.orders || []);
      } else {
        const errBody = await ordRes.json().catch(() => ({}));
        firstError = firstError || errBody.error || `Erreur Commandes (${ordRes.status})`;
      }

      if (msgRes.ok) {
        const m = await msgRes.json();
        setMessages(m.messages || []);
      }
      if (emailRes.ok) {
        const em = await emailRes.json();
        setEmailStatus(em);
      }
      setAdminDbError(firstError);
    } finally {
      setLoadingData(false);
    }
  }, [adminToken, setAdminToken]);

  useEffect(() => {
    if (adminToken) {
      loadAdminWorkspace();
    }
  }, [adminToken, loadAdminWorkspace]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput.length < (configured ? 1 : 6)) {
      setAuthError(
        configured ? 'Please enter your password.' : 'Password must be at least 6 characters.'
      );
      return;
    }

    setAuthSubmitting(true);
    try {
      const endpoint = configured ? '/api/admin/login' : '/api/admin/claim';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setAdminToken(data.token);
      setConfigured(true);
      setPasswordInput('');
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    setAdminToken(null);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    setProductError(null);
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProductError(data.error || 'Upload failed.');
        return;
      }
      setProductForm((prev) => ({ ...prev, image_url: data.url }));
      showToast('Photo uploaded');
    } catch {
      setProductError('Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setProductError(null);

    const priceNum = Number(productForm.price_mad);
    const stockNum = Number(productForm.stock);
    if (!productForm.name_fr.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      setProductError('Product name (FR) and a positive MAD price are required.');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        category: productForm.category,
        subcategory: productForm.subcategory,
        name_fr: productForm.name_fr.trim(),
        name_en: productForm.name_en.trim() || productForm.name_fr.trim(),
        name_ar: productForm.name_ar.trim() || productForm.name_fr.trim(),
        desc_fr: productForm.desc_fr.trim(),
        desc_en: productForm.desc_en.trim() || productForm.desc_fr.trim(),
        desc_ar: productForm.desc_ar.trim() || productForm.desc_fr.trim(),
        price_mad: priceNum,
        unit_fr: productForm.unit_fr.trim() || '1 kg',
        unit_en: productForm.unit_en.trim() || '1 kg',
        unit_ar: productForm.unit_ar.trim() || '1 كغ',
        stock: Number.isFinite(stockNum) ? Math.max(0, Math.floor(stockNum)) : 0,
        available: productForm.available,
        featured: productForm.featured,
        image_url: productForm.image_url.trim(),
        harvest_note_fr: productForm.harvest_note_fr.trim(),
        harvest_note_en: productForm.harvest_note_en.trim(),
        harvest_note_ar: productForm.harvest_note_ar.trim(),
      };

      const isEdit = Boolean(productForm.id);
      const res = await fetch(
        isEdit ? `/api/admin/products/${productForm.id}` : '/api/admin/products',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setProductError(data.error || 'Could not save product.');
        return;
      }

      setShowProductForm(false);
      setProductForm(EMPTY_PRODUCT_FORM);
      await Promise.all([loadAdminWorkspace(), refreshProducts()]);
      showToast(isEdit ? 'Product updated' : 'Product created');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductAvailability = async (p: Product) => {
    if (!adminToken) return;
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ available: !p.available }),
    });
    await Promise.all([loadAdminWorkspace(), refreshProducts()]);
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!adminToken) return;
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await Promise.all([loadAdminWorkspace(), refreshProducts()]);
    showToast('Product deleted');
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!adminToken) return;
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    await loadAdminWorkspace();
    showToast(`Order ${orderId} updated to ${status}`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      await loadAdminWorkspace();
      showToast(`Order ${orderId} deleted`);
    }
  };

  const handleMessageStatus = async (msgId: string, status: ContactMessage['status']) => {
    if (!adminToken) return;
    await fetch(`/api/admin/messages/${msgId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    await loadAdminWorkspace();
  };

  const handleSaveSiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !contentForm) return;
    setSavingContent(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(contentForm),
      });
      if (res.ok) {
        await Promise.all([refreshSiteContent(), loadAdminWorkspace()]);
        showToast('Website content updated');
      }
    } finally {
      setSavingContent(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!adminToken) return;
    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const ejCfg = resolveEmailJsConfig(contentForm);
      const sampleOrder: Order = {
        id: `TEST-${Date.now().toString().slice(-6)}`,
        customer_name: 'Test Domaine Essaoudi',
        customer_phone: '+212661458812',
        customer_email: ejCfg.recipientEmail,
        city: 'Berrechid',
        delivery_zone: 'casablanca-chaouia',
        address: 'Douar Ouled Ziane, Route de Berrechid',
        delivery_method: 'delivery',
        delivery_fee_mad: 0,
        subtotal_mad: 250,
        total_mad: 250,
        notes: 'Test notification Domaine Essaoudi',
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
        created_at: new Date().toISOString(),
      };

      if (ejCfg.configured) {
        const res = await sendOrderViaEmailJS(sampleOrder, ejCfg);
        setTestEmailResult({
          sent: res.sent,
          recipient: ejCfg.recipientEmail,
          error: res.error,
        });
        showToast(
          res.sent
            ? `EmailJS test sent to ${ejCfg.recipientEmail}`
            : res.error || 'EmailJS test failed'
        );
        return;
      }

      const fallbackRes = await sendOrderViaFormSubmit(sampleOrder, ejCfg.recipientEmail);
      setTestEmailResult({
        sent: fallbackRes.sent,
        recipient: ejCfg.recipientEmail,
        error: fallbackRes.needsActivation
          ? `Activation email sent to ${ejCfg.recipientEmail} (click Activate Form once in Gmail, or paste EmailJS IDs above).`
          : fallbackRes.error,
      });
      showToast(
        fallbackRes.sent
          ? `Test email sent to ${ejCfg.recipientEmail}`
          : fallbackRes.needsActivation
            ? `Check ${ejCfg.recipientEmail} to activate direct email alerts`
            : fallbackRes.error || `Could not dispatch to ${ejCfg.recipientEmail}`
      );
    } finally {
      setSendingTestEmail(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return adminProducts.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name_fr.toLowerCase().includes(q) ||
          p.name_en.toLowerCase().includes(q) ||
          p.name_ar.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adminProducts, categoryFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  if (authChecking) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-[#516358]">
        {t.common.loading}
      </div>
    );
  }

  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="bg-white rounded-2xl border border-[#DCE8DF] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0E3B22]/10 text-[#0E3B22] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-[#0F2418]">
                {configured ? t.admin.loginTitle : t.admin.claimTitle}
              </h1>
              <p className="text-xs text-[#516358] mt-0.5">
                {configured ? t.admin.loginSubtitle : t.admin.claimSubtitle}
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-xs font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#4A5D52] mb-1.5"
              >
                {t.admin.passwordLabel}
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete={configured ? 'current-password' : 'new-password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                placeholder={configured ? '••••••••' : 'Minimum 6 characters'}
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-[#0E3B22] hover:bg-[#082716] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {authSubmitting
                ? t.common.loading
                : configured
                  ? t.admin.loginBtn
                  : t.admin.claimBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE8DF]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0F2418]">
            {t.admin.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DCE8DF] bg-white hover:bg-[#EDF4EE] text-xs font-semibold text-[#0F2418] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>{t.admin.logoutBtn}</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex flex-wrap gap-1.5 p-1.5 bg-[#EDF4EE] rounded-xl border border-[#DCE8DF] w-fit"
      >
        {(
          [
            { key: 'overview', label: t.admin.tabs.overview },
            { key: 'products', label: t.admin.tabs.products },
            { key: 'orders', label: t.admin.tabs.orders },
            { key: 'content', label: t.admin.tabs.content },
            { key: 'sql', label: t.admin.tabs.sql },
          ] as Array<{ key: AdminTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-[#0F2418] shadow-sm'
                : 'text-[#516358] hover:text-[#0F2418]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {adminDbError && activeTab !== 'sql' && (
        <div className="rounded-xl border border-red-200 bg-[#FEE2E2] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#991B1B]">
          <span>{adminDbError}</span>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className="px-3 py-1.5 rounded-lg bg-[#9E2A2B] text-white font-semibold hover:bg-[#7F1D1D] transition-colors shrink-0"
          >
            Ouvrir SQL Editor &amp; Supabase
          </button>
        </div>
      )}

      {emailStatus && !emailStatus.configured && activeTab !== 'content' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
          <span>
            Configurez vos 3 identifiants EmailJS (Service ID, Template ID, Public Key) pour recevoir
            automatiquement chaque commande sur <strong dir="ltr">{emailStatus.recipientEmail}</strong>.
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className="px-3 py-1.5 rounded-lg bg-[#0E3B22] text-white font-semibold hover:bg-[#082716] transition-colors"
          >
            Configurer EmailJS
          </button>
        </div>
      )}

      {loadingData && !stats ? (
        <div className="py-12 text-sm text-[#516358]">{t.common.loading}</div>
      ) : null}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.revenue}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#0E3B22] tabular-nums">
                {formatMad(stats.totalRevenueMad, lang)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.totalOrders}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#0F2418] tabular-nums">
                {stats.totalOrders}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.pendingOrders}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#9A6B32] tabular-nums">
                {stats.pendingOrders}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.completedOrders}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#0F2418] tabular-nums">
                {stats.completedOrders}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.totalProducts}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#0F2418] tabular-nums">
                {stats.totalProducts}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#DCE8DF] p-5 space-y-1">
              <div className="text-xs text-[#516358]">{t.admin.kpis.unreadMessages}</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-[#0F2418] tabular-nums">
                {stats.unreadMessages}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white rounded-xl border border-[#DCE8DF] p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#0F2418]">
                {t.common.allCategories}
              </h2>
              <div className="divide-y divide-[#DCE8DF] text-sm">
                <div className="py-3 flex justify-between">
                  <span className="text-[#4A5D52]">{t.nav.vegetables}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {stats.categoryCounts.vegetables}
                  </span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-[#4A5D52]">{t.nav.oliveOil}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {stats.categoryCounts['olive-oil']}
                  </span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-[#4A5D52]">{t.nav.poultry}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {stats.categoryCounts.poultry}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-white rounded-xl border border-[#DCE8DF] p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#0F2418]">
                {t.admin.tabs.orders}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#DCE8DF] text-xs text-[#516358] text-start">
                      <th className="py-2 font-medium text-start">ID</th>
                      <th className="py-2 font-medium text-start">Client</th>
                      <th className="py-2 font-medium text-start">Status</th>
                      <th className="py-2 font-medium text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE8DF]/60">
                    {stats.recentOrders.map((ord) => (
                      <tr key={ord.id} className="h-11">
                        <td className="font-mono text-xs tabular-nums">{ord.id}</td>
                        <td className="font-medium text-[#0F2418]">{ord.customer_name}</td>
                        <td>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_STYLES[ord.status]}`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="text-end font-semibold tabular-nums">
                          {formatMad(ord.total_mad, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#516358] absolute start-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="ps-9 pe-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-white"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | ProductCategory)}
                aria-label="Filter products by category"
                className="px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-white"
              >
                <option value="all">{t.common.allCategories}</option>
                <option value="vegetables">{t.nav.vegetables}</option>
                <option value="olive-oil">{t.nav.oliveOil}</option>
                <option value="poultry">{t.nav.poultry}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setProductForm(EMPTY_PRODUCT_FORM);
                setProductError(null);
                setShowProductForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E3B22] hover:bg-[#082716] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.addProduct}</span>
            </button>
          </div>

          {showProductForm && (
            <form
              onSubmit={handleSaveProduct}
              className="bg-white rounded-xl border border-[#0E3B22]/40 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#0F2418]">
                  {productForm.id ? t.admin.editProduct : t.admin.addProduct}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="text-xs font-semibold text-[#516358] hover:text-[#0F2418]"
                >
                  {t.common.cancel}
                </button>
              </div>

              {productError && (
                <div className="p-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-xs font-medium">
                  {productError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category: e.target.value as ProductCategory,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  >
                    <option value="vegetables">{t.nav.vegetables}</option>
                    <option value="olive-oil">{t.nav.oliveOil}</option>
                    <option value="poultry">{t.nav.poultry}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={productForm.subcategory}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, subcategory: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                      Price (MAD) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={productForm.price_mad}
                      onChange={(e) =>
                        setProductForm((prev) => ({ ...prev, price_mad: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4A5D52] mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm((prev) => ({ ...prev, stock: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    Nom (FR) *
                  </label>
                  <input
                    type="text"
                    value={productForm.name_fr}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, name_fr: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">Name (EN)</label>
                  <input
                    type="text"
                    value={productForm.name_en}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, name_en: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    الاسم (AR)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={productForm.name_ar}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, name_ar: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    Description (FR)
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.desc_fr}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, desc_fr: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    Description (EN)
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.desc_en}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, desc_en: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                    الوصف (AR)
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={productForm.desc_ar}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, desc_ar: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>
              </div>

              {/* Image Upload & Preset Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-6 space-y-2">
                  <label className="block text-xs font-medium text-[#4A5D52]">
                    Product Image URL or Upload
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={productForm.image_url}
                      onChange={(e) =>
                        setProductForm((prev) => ({ ...prev, image_url: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0E3B22] text-[#0E3B22] text-xs font-semibold cursor-pointer hover:bg-[#0E3B22]/5 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{uploadingImage ? t.admin.uploading : t.admin.uploadImage}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileUpload}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((img) => {
                      const isSelected = productForm.image_url === img.url;
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => setProductForm((prev) => ({ ...prev, image_url: img.url }))}
                          className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                            isSelected
                              ? 'border-[#0E3B22] bg-[#0E3B22]/10 text-[#0E3B22] font-semibold'
                              : 'border-[#DCE8DF] text-[#516358] hover:bg-[#EDF4EE]'
                          }`}
                        >
                          {img.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-3 flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F2418]">
                    <input
                      type="checkbox"
                      checked={productForm.available}
                      onChange={(e) =>
                        setProductForm((prev) => ({ ...prev, available: e.target.checked }))
                      }
                    />
                    <span>Available</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F2418]">
                    <input
                      type="checkbox"
                      checked={productForm.featured}
                      onChange={(e) =>
                        setProductForm((prev) => ({ ...prev, featured: e.target.checked }))
                      }
                    />
                    <span>Featured</span>
                  </label>
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="px-5 py-2.5 rounded-lg bg-[#0E3B22] hover:bg-[#082716] text-white text-sm font-semibold"
                  >
                    {savingProduct ? t.common.loading : t.common.save}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-[#DCE8DF] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#DCE8DF] text-xs text-[#516358]">
                  <th className="py-3 px-4 font-medium text-start">Product</th>
                  <th className="py-3 px-4 font-medium text-start">Category</th>
                  <th className="py-3 px-4 font-medium text-end">Price</th>
                  <th className="py-3 px-4 font-medium text-end">Stock</th>
                  <th className="py-3 px-4 font-medium text-start">Status</th>
                  <th className="py-3 px-4 font-medium text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE8DF]/70">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7FAF7]/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#EDF4EE] shrink-0">
                          <ResilientImage
                            src={p.image_url}
                            alt={p.name_fr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-[#0F2418]">
                            {getLocalizedField(p, 'name', lang)}
                          </div>
                          <div className="text-xs text-[#516358]">
                            {getLocalizedField(p, 'unit', lang)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#516358]">{p.category}</td>
                    <td className="py-3 px-4 text-end font-semibold tabular-nums">
                      {formatMad(p.price_mad, lang)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono tabular-nums">{p.stock}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleProductAvailability(p)}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          p.available
                            ? 'bg-[#0E3B22]/15 text-[#082716]'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {p.available ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${p.name_fr}`}
                          onClick={() => {
                            setProductForm({
                              id: p.id,
                              category: p.category,
                              subcategory: p.subcategory,
                              name_fr: p.name_fr,
                              name_en: p.name_en,
                              name_ar: p.name_ar,
                              desc_fr: p.desc_fr,
                              desc_en: p.desc_en,
                              desc_ar: p.desc_ar,
                              price_mad: String(p.price_mad),
                              unit_fr: p.unit_fr,
                              unit_en: p.unit_en,
                              unit_ar: p.unit_ar,
                              stock: String(p.stock),
                              available: p.available,
                              featured: p.featured,
                              image_url: p.image_url,
                              harvest_note_fr: p.harvest_note_fr,
                              harvest_note_en: p.harvest_note_en,
                              harvest_note_ar: p.harvest_note_ar,
                            });
                            setShowProductForm(true);
                          }}
                          className="p-1.5 rounded-lg border border-[#DCE8DF] hover:bg-[#EDF4EE] text-[#4A5D52]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${p.name_fr}`}
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 rounded-lg border border-[#DCE8DF] hover:bg-red-50 text-[#9E2A2B]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                'all',
                'pending',
                'confirmed',
                'preparing',
                'shipped',
                'completed',
                'cancelled',
              ] as const
            ).map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setOrderStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  orderStatusFilter === statusKey
                    ? 'bg-[#0E3B22] text-white border-[#0E3B22]'
                    : 'bg-white text-[#4A5D52] border-[#DCE8DF]'
                }`}
              >
                {statusKey}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#DCE8DF] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#DCE8DF] text-xs text-[#516358]">
                  <th className="py-3 px-4 font-medium text-start">Order</th>
                  <th className="py-3 px-4 font-medium text-start">Customer</th>
                  <th className="py-3 px-4 font-medium text-start">Items</th>
                  <th className="py-3 px-4 font-medium text-start">Email Alert</th>
                  <th className="py-3 px-4 font-medium text-end">Total</th>
                  <th className="py-3 px-4 font-medium text-start">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE8DF]/70">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="align-top">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold tabular-nums">{ord.id}</div>
                      <div className="text-xs text-[#516358] mt-0.5">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-semibold text-[#0F2418]">{ord.customer_name}</div>
                      <div className="text-xs text-[#4A5D52] font-mono tabular-nums" dir="ltr">
                        {ord.customer_phone}
                      </div>
                      <div className="text-xs text-[#516358]">
                        {ord.city} · {ord.address}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <ul className="space-y-1 text-xs text-[#4A5D52]">
                        {ord.items.map((it, idx) => (
                          <li key={idx}>
                            {it.quantity} × {it.name}
                            {it.variantLabel ? ` (${it.variantLabel})` : ''}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          ord.email_status === 'sent'
                            ? 'bg-emerald-100 text-emerald-900'
                            : ord.email_status === 'failed'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {ord.email_status === 'sent'
                          ? 'Sent'
                          : ord.email_status === 'failed'
                            ? 'Failed'
                            : ord.email_status === 'pending_smtp'
                              ? 'Pending SMTP'
                              : 'Pending EmailJS'}
                      </span>
                      <div className="text-xs text-[#516358] font-mono" dir="ltr">
                        {ord.email_recipient || 'domaineessaoudi@gmail.com'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-end font-bold tabular-nums">
                      {formatMad(ord.total_mad, lang)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={ord.status}
                          aria-label={`Order status for ${ord.id}`}
                          onChange={(e) =>
                            handleOrderStatusChange(ord.id, e.target.value as OrderStatus)
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#DCE8DF] ${ORDER_STATUS_STYLES[ord.status]}`}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="preparing">preparing</option>
                          <option value="shipped">shipped</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                        <button
                          type="button"
                          aria-label={`Delete order ${ord.id}`}
                          onClick={() => handleDeleteOrder(ord.id)}
                          className="p-1.5 rounded-lg border border-[#DCE8DF] hover:bg-red-50 text-[#9E2A2B]"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT & INQUIRIES TAB */}
      {activeTab === 'content' && contentForm && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveSiteContent}
            className="lg:col-span-7 bg-white rounded-xl border border-[#DCE8DF] p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-semibold text-[#0F2418]">
              Website Content & Farm Contacts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                  Farm Phone (+212)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={contentForm.phone}
                  onChange={(e) =>
                    setContentForm((prev) => (prev ? { ...prev, phone: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                  WhatsApp (+212)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={contentForm.whatsapp}
                  onChange={(e) =>
                    setContentForm((prev) => (prev ? { ...prev, whatsapp: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-order-email"
                  className="block text-xs font-medium text-[#4A5D52] mb-1"
                >
                  Order Email
                </label>
                <input
                  id="admin-order-email"
                  type="email"
                  dir="ltr"
                  value={contentForm.email}
                  onChange={(e) =>
                    setContentForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="admin-social-instagram"
                  className="block text-xs font-medium text-[#4A5D52] mb-1"
                >
                  Instagram URL
                </label>
                <input
                  id="admin-social-instagram"
                  type="url"
                  dir="ltr"
                  placeholder="https://www.instagram.com/domaineessaoudi/"
                  value={contentForm.socialInstagram || ''}
                  onChange={(e) =>
                    setContentForm((prev) =>
                      prev ? { ...prev, socialInstagram: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-social-facebook"
                  className="block text-xs font-medium text-[#4A5D52] mb-1"
                >
                  Facebook URL
                </label>
                <input
                  id="admin-social-facebook"
                  type="url"
                  dir="ltr"
                  placeholder="https://www.facebook.com/profile.php?id=61596964379987"
                  value={contentForm.socialFacebook || ''}
                  onChange={(e) =>
                    setContentForm((prev) =>
                      prev ? { ...prev, socialFacebook: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE8DF] bg-[#F7FAF7] p-4 space-y-4">
              {(() => {
                const ej = resolveEmailJsConfig(contentForm);
                const isReady = ej.configured || Boolean(emailStatus?.configured);
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2418]">
                        <Mail className="w-4 h-4 text-[#0E3B22]" aria-hidden="true" />
                        <span>EmailJS Orders → {ej.recipientEmail}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          isReady
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {ej.configured
                          ? 'EmailJS Active'
                          : emailStatus?.smtpConfigured
                            ? 'SMTP Active'
                            : 'EmailJS IDs Needed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="admin-emailjs-service"
                          className="block text-xs font-medium text-[#4A5D52] mb-1"
                        >
                          EmailJS Service ID
                        </label>
                        <input
                          id="admin-emailjs-service"
                          type="text"
                          dir="ltr"
                          placeholder="service_xxxxxxx"
                          value={contentForm.emailjsServiceId || ''}
                          onChange={(e) =>
                            setContentForm((prev) =>
                              prev ? { ...prev, emailjsServiceId: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE8DF] bg-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="admin-emailjs-template"
                          className="block text-xs font-medium text-[#4A5D52] mb-1"
                        >
                          EmailJS Template ID
                        </label>
                        <input
                          id="admin-emailjs-template"
                          type="text"
                          dir="ltr"
                          placeholder="template_xxxxxxx"
                          value={contentForm.emailjsTemplateId || ''}
                          onChange={(e) =>
                            setContentForm((prev) =>
                              prev ? { ...prev, emailjsTemplateId: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE8DF] bg-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="admin-emailjs-key"
                          className="block text-xs font-medium text-[#4A5D52] mb-1"
                        >
                          EmailJS Public Key
                        </label>
                        <input
                          id="admin-emailjs-key"
                          type="text"
                          dir="ltr"
                          placeholder="Public Key"
                          value={contentForm.emailjsPublicKey || ''}
                          onChange={(e) =>
                            setContentForm((prev) =>
                              prev ? { ...prev, emailjsPublicKey: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#DCE8DF] bg-white"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-[#516358] leading-relaxed">
                      EmailJS template variables sent automatically:{' '}
                      <code className="text-[#0E3B22]">
                        {'{{to_email}}, {{order_id}}, {{customer_name}}, {{customer_phone}}, {{city}}, {{address}}, {{items_summary}}, {{total_mad}}, {{message}}'}
                      </code>
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={sendingTestEmail}
                        onClick={handleSendTestEmail}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#0E3B22] text-[#0E3B22] hover:bg-[#0E3B22]/5 disabled:opacity-60 text-xs font-semibold transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {sendingTestEmail ? t.common.loading : 'Test EmailJS Delivery'}
                        </span>
                      </button>
                      {testEmailResult && (
                        <span
                          className={`text-xs font-medium ${
                            testEmailResult.sent ? 'text-emerald-800' : 'text-amber-800'
                          }`}
                        >
                          {testEmailResult.sent
                            ? `Sent via EmailJS to ${testEmailResult.recipient}`
                            : testEmailResult.error || `Not sent for ${testEmailResult.recipient}`}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                  Hero Title (FR)
                </label>
                <input
                  type="text"
                  value={contentForm.heroTitle_fr}
                  onChange={(e) =>
                    setContentForm((prev) =>
                      prev ? { ...prev, heroTitle_fr: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                  Hero Title (EN)
                </label>
                <input
                  type="text"
                  value={contentForm.heroTitle_en}
                  onChange={(e) =>
                    setContentForm((prev) =>
                      prev ? { ...prev, heroTitle_en: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5D52] mb-1">
                  Hero Title (AR)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={contentForm.heroTitle_ar}
                  onChange={(e) =>
                    setContentForm((prev) =>
                      prev ? { ...prev, heroTitle_ar: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingContent}
              className="px-5 py-2.5 rounded-lg bg-[#0E3B22] hover:bg-[#082716] text-white text-sm font-semibold"
            >
              {savingContent ? t.common.loading : t.common.save}
            </button>
          </form>

          <div className="lg:col-span-5 bg-white rounded-xl border border-[#DCE8DF] p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#0F2418]">
              Customer Inquiries ({messages.length})
            </h2>
            {messages.length === 0 ? (
              <p className="text-sm text-[#516358]">No inquiries yet.</p>
            ) : (
              <div className="divide-y divide-[#DCE8DF] space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#0F2418]">{m.name}</span>
                      <span className="text-xs font-mono text-[#516358]">{m.status}</span>
                    </div>
                    <div className="text-xs text-[#0E3B22] font-mono" dir="ltr">
                      {m.phone}
                    </div>
                    <div className="text-xs font-semibold text-[#4A5D52]">{m.subject}</div>
                    <p className="text-xs text-[#516358] leading-relaxed">{m.message}</p>
                    {m.status === 'unread' && (
                      <button
                        type="button"
                        onClick={() => handleMessageStatus(m.id, 'read')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E3B22] hover:underline pt-1"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Mark as read</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SQL EDITOR & SUPABASE TAB */}
      {activeTab === 'sql' && <AdminSqlEditor adminToken={adminToken} showToast={showToast} />}
    </div>
  );
}
