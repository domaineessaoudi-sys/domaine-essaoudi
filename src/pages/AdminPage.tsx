import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Box,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Edit3,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Receipt,
  Rocket,
  Search,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Zap,
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
    navigate,
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
  const [orderYearFilter, setOrderYearFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState<number>(1);
  const ordersPerPage = 10;
  const darkMode = true;

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
      }).catch(() => { });
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

  const availableOrderYears = useMemo(() => {
    const years = new Set<string>();
    orders.forEach((o) => {
      if (o.created_at) {
        const d = new Date(o.created_at);
        if (!isNaN(d.getTime())) {
          years.add(String(d.getFullYear()));
        }
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderYearFilter !== 'all') {
        const d = o.created_at ? new Date(o.created_at) : null;
        if (!d || isNaN(d.getTime()) || String(d.getFullYear()) !== orderYearFilter) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderYearFilter]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const currentPage = Math.min(orderPage, totalOrderPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, currentPage, ordersPerPage]);

  if (authChecking) {
    return (
      <div className="admin-theme dark min-h-screen flex items-center justify-center bg-[#070E13]">
        <div className="text-sm font-medium text-[#7A98A8]">{t.common.loading}</div>
      </div>
    );
  }

  if (!adminToken) {
    return (
      <div className="admin-theme dark min-h-screen flex flex-col bg-[#070E13] text-[#EEF6FA]">
        {/* Backoffice Clean Header Bar */}
        <header className="border-b border-[#1E3444] bg-[#0D171F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white flex items-center justify-center font-bold text-sm shadow-md">
                DE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm sm:text-base text-[#EEF6FA]">
                    Domaine Essaoudi
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Backoffice
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#1E3444] bg-[#12222B] text-[#EEF6FA] hover:bg-[#162833] transition-colors"
                title="Retourner au site public"
              >
                <Globe className="w-4 h-4 text-[#38BDF8]" />
                <span>Voir web site</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 py-16 sm:py-24">
          <div className="max-w-md w-full bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-[#EEF6FA]">
                  {configured ? t.admin.loginTitle : t.admin.claimTitle}
                </h1>
                <p className="text-xs text-[#7A98A8] mt-0.5">
                  {configured ? t.admin.loginSubtitle : t.admin.claimSubtitle}
                </p>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-[#8AA4B4] mb-1.5"
                >
                  {t.admin.passwordLabel}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete={configured ? 'current-password' : 'new-password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white focus:outline-none focus:border-sky-500"
                  placeholder={configured ? '••••••••' : 'Minimum 6 characters'}
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-md shadow-sky-600/30"
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
      </div>
    );
  }

  return (
    <div className="admin-theme dark min-h-screen p-2 sm:p-5 lg:p-7 flex justify-center items-start bg-[#070E13]">
      {/* Main Dashboard Canvas Shell (Floating Card from design) */}
      <div className="w-full bg-[#0D171F] rounded-[32px] sm:rounded-[36px] border border-[#1E3444] shadow-[0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
        {/* Top Header Bar inside Shell */}
        <header className="h-20 border-b border-[#182B37] px-4 sm:px-8 flex items-center justify-between gap-4 bg-[#0D171F]/90 backdrop-blur-md shrink-0">
          {/* Left Brand + Active Section */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-sky-500/20 shrink-0">
                DE
              </div>
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#67D4F8] truncate">
                domaine essaoudi
              </span>
            </div>

            <span className="text-[#253E50] text-xl font-light hidden sm:inline">
              |
            </span>

            <span className="font-display font-bold text-xs sm:text-sm tracking-wider text-[#E2EFF7] uppercase truncate hidden sm:inline">
              {activeTab === 'overview'
                ? 'DASHBOARD'
                : activeTab === 'products'
                  ? 'PRODUITS'
                  : activeTab === 'orders'
                    ? 'COMMANDES'
                    : activeTab === 'content'
                      ? 'CONTENU'
                      : 'SUPABASE SQL'}
            </span>
          </div>

          {/* Right Area: Alerts, User greeting, CTA "VOIR WEB SITE", Logout */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#7A98A8] hover:text-[#38BDF8] hover:bg-[#152530] transition-colors relative"
                title="Messages et alertes"
                aria-label="Alertes"
              >
                <Bell className="w-5 h-5" />
                {stats && stats.unreadMessages > 0 && (
                  <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </button>
            </div>

            {/* User Greeting & Avatar */}
            <div className="flex items-center gap-2.5 ps-1 sm:ps-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#1E3444] shadow-xs shrink-0">
                SA
              </div>
              <div className="text-start hidden lg:block">
                <div className="text-[10px] text-[#7A98A8] leading-none">
                  Bonjour,
                </div>
                <div className="text-xs font-bold text-[#E2EFF7] leading-tight mt-0.5">
                  Admin Said
                </div>
              </div>
            </div>

            {/* Prominent Pill CTA: VOIR WEB SITE (From image design) */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-[#00C9A7] to-[#00A887] hover:from-[#00B899] hover:to-[#00987A] text-white font-bold text-xs uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md shadow-emerald-500/20 hover:shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Retourner à la boutique publique"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VOIR WEB SITE</span>
              <span className="sm:hidden">SITE</span>
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
              title={t.admin.logoutBtn}
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body Section: Left Sticky Pill Sidebar + Main Content Area */}
        <div className="flex flex-col md:flex-row flex-1 p-4 sm:p-6 lg:p-8 gap-6 lg:gap-8 items-start relative">
          {/* Left Vertical Pill Sidebar (Fixed / Sticky Pill Capsule) */}
          <aside className="sticky top-6 self-start w-full md:w-20 bg-[#12222B] rounded-2xl md:rounded-[40px] border border-[#1E3444] p-2 sm:p-3 md:py-6 flex flex-row md:flex-col items-center justify-between md:justify-start gap-2 md:gap-6 shrink-0 shadow-lg z-30">
            {(
              [
                { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { key: 'products', label: 'Produits', icon: Package },
                { key: 'orders', label: 'Commandes', icon: ShoppingCart },
                { key: 'content', label: 'Contenu', icon: Sliders },
                { key: 'sql', label: 'Supabase', icon: Database },
              ] as const
            ).map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${isActive
                    ? 'bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-sky-500/25 scale-105'
                    : 'text-[#648496] hover:text-[#38BDF8] hover:bg-[#1A2E3B]'
                    }`}
                  title={item.label}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <span className="text-[9px] font-semibold leading-none tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}

            <div className="hidden md:flex mt-auto pt-4 text-[#425E70]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#425E70]"></div>
            </div>
          </aside>

          {/* Right Main Working Area */}
          <main className="flex-1 w-full min-w-0 space-y-6">
            {adminDbError && activeTab !== 'sql' && (
              <div className="rounded-2xl border border-red-200 bg-[#FEE2E2] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#991B1B]">
                <span>{adminDbError}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('sql')}
                  className="px-3 py-1.5 rounded-xl bg-[#9E2A2B] text-white font-semibold hover:bg-[#7F1D1D] transition-colors shrink-0"
                >
                  Ouvrir SQL Editor &amp; Supabase
                </button>
              </div>
            )}

            {emailStatus && !emailStatus.configured && activeTab !== 'content' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                <span>
                  Configurez vos 3 identifiants EmailJS pour recevoir automatiquement chaque commande sur{' '}
                  <strong dir="ltr">{emailStatus.recipientEmail}</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className="px-3 py-1.5 rounded-xl bg-[#0284C7] text-white font-semibold hover:bg-[#0369A1] transition-colors"
                >
                  Configurer EmailJS
                </button>
              </div>
            )}

            {loadingData && !stats ? (
              <div className="py-12 text-sm text-[#516358] text-center">{t.common.loading}</div>
            ) : null}

            {/* OVERVIEW TAB (Exact Dashboard Recreation) */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Subtitle with Lightning icon */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#5A7888] dark:text-[#8AA4B4]">
                  <Zap className="w-4 h-4 text-sky-500 fill-sky-500 shrink-0" />
                  <span>
                    Aperçu en temps réel des statistiques, commandes et produits de votre boutique Domaine Essaoudi
                  </span>
                </div>

                {/* Top 4 KPI Metrics Row (Matching the 4 horizontal metrics) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Metric 1: Total Products */}
                  <div className="bg-white dark:bg-[#12222B] rounded-2xl border border-[#E1EDF3] dark:border-[#1E3444] p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#132E3F] dark:text-[#EEF6FA] tabular-nums">
                        {stats.totalProducts}
                      </div>
                      <div className="text-[11px] font-bold tracking-wider text-[#7A98A8] dark:text-[#6C8A9B] uppercase mt-1">
                        PRODUITS EN LIGNE
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center shrink-0">
                      <Rocket className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Metric 2: Total Orders */}
                  <div className="bg-white dark:bg-[#12222B] rounded-2xl border border-[#E1EDF3] dark:border-[#1E3444] p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#132E3F] dark:text-[#EEF6FA] tabular-nums">
                        {stats.totalOrders}
                      </div>
                      <div className="text-[11px] font-bold tracking-wider text-[#7A98A8] dark:text-[#6C8A9B] uppercase mt-1">
                        COMMANDES TOTALES
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Metric 3: Total Revenue */}
                  <div className="bg-white dark:bg-[#12222B] rounded-2xl border border-[#E1EDF3] dark:border-[#1E3444] p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#0284C7] dark:text-[#38BDF8] tabular-nums">
                        {stats.totalRevenueMad} <span className="text-sm font-semibold text-[#7A98A8]">MAD</span>
                      </div>
                      <div className="text-[11px] font-bold tracking-wider text-[#7A98A8] dark:text-[#6C8A9B] uppercase mt-1">
                        CHIFFRE D'AFFAIRES
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 fill-amber-500/20" />
                    </div>
                  </div>

                  {/* Metric 4: Messages */}
                  <div className="bg-white dark:bg-[#12222B] rounded-2xl border border-[#E1EDF3] dark:border-[#1E3444] p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#132E3F] dark:text-[#EEF6FA] tabular-nums">
                        {stats.unreadMessages}
                      </div>
                      <div className="text-[11px] font-bold tracking-wider text-[#7A98A8] dark:text-[#6C8A9B] uppercase mt-1">
                        MESSAGES CLIENTS
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Middle Two-Column Grid: Donut + Bar Chart (Left) and Recent Orders (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Card: Category Breakdown with Donut & Bar Charts */}
                  <div className="lg:col-span-7 bg-[#F4F9FC] dark:bg-[#12222B] rounded-[28px] border border-[#E1EDF3] dark:border-[#1E3444] p-6 space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display font-bold text-base text-[#132E3F] dark:text-[#EEF6FA]">
                          RÉPARTITION DU CATALOGUE
                        </h2>
                        <p className="text-xs text-[#7A98A8] dark:text-[#6C8A9B] mt-0.5">
                          Distribution des produits par filière agricole
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-white dark:bg-[#0B151C] p-1 rounded-xl border border-[#E1EDF3] dark:border-[#1E3444] text-xs font-semibold">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg bg-[#0284C7] text-white shadow-xs"
                        >
                          Total
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-[#7A98A8] hover:text-[#0284C7]"
                        >
                          Hebdo
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-[#7A98A8] hover:text-[#0284C7]"
                        >
                          Mois
                        </button>
                      </div>
                    </div>

                    {/* Donut and Bar Chart side-by-side inside card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pt-2">
                      {/* SVG Donut Chart with segmented colors */}
                      <div className="flex flex-col items-center justify-center relative">
                        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 120 120">
                          {/* Background Ring */}
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="14"
                            className="text-[#E2EFF6] dark:text-[#182C38]"
                            fill="transparent"
                          />
                          {/* Segment 1: Olive Oil (Amber) */}
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            stroke="#F59E0B"
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={
                              282.7 -
                              ((stats.categoryCounts['olive-oil'] || 0) /
                                Math.max(1, stats.totalProducts)) *
                              282.7
                            }
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700"
                          />
                          {/* Segment 2: Poultry (Blue) */}
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            stroke="#0284C7"
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={
                              282.7 -
                              ((stats.categoryCounts.poultry || 0) /
                                Math.max(1, stats.totalProducts)) *
                              282.7
                            }
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 opacity-90"
                          />
                          {/* Segment 3: Vegetables (Emerald) */}
                          <circle
                            cx="60"
                            cy="60"
                            r="45"
                            stroke="#10B981"
                            strokeWidth="14"
                            strokeDasharray="282.7"
                            strokeDashoffset={
                              282.7 -
                              ((stats.categoryCounts.vegetables || 0) /
                                Math.max(1, stats.totalProducts)) *
                              282.7
                            }
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 opacity-80"
                          />
                        </svg>

                        {/* Donut Center Content Badge */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="w-9 h-9 rounded-full bg-[#0284C7] text-white flex items-center justify-center shadow-sm mb-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="font-display font-extrabold text-lg text-[#132E3F] dark:text-[#EEF6FA] leading-tight">
                            {stats.totalProducts}
                          </div>
                          <div className="text-[10px] font-semibold text-[#7A98A8] dark:text-[#6C8A9B]">
                            Produits
                          </div>
                        </div>
                      </div>

                      {/* Vertical Bar Chart Column Bars (Matching image) */}
                      <div className="flex items-end justify-between gap-3 h-44 px-3 pb-2 border-b border-[#E1EDF3] dark:border-[#1E3444]">
                        {/* Bar 1: Olive Oil */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-[#132E3F] dark:text-[#EEF6FA] tabular-nums">
                            {stats.categoryCounts['olive-oil']}
                          </span>
                          <div
                            className="w-full max-w-[32px] bg-[#F59E0B] rounded-t-xl transition-all duration-700"
                            style={{
                              height: `${Math.max(
                                24,
                                ((stats.categoryCounts['olive-oil'] || 0) /
                                  Math.max(1, stats.totalProducts)) *
                                100
                              )}px`,
                            }}
                          ></div>
                          <span className="text-[10px] font-semibold text-[#7A98A8] dark:text-[#6C8A9B] truncate w-full text-center">
                            Huile
                          </span>
                        </div>

                        {/* Bar 2: Poultry */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8] tabular-nums">
                            {stats.categoryCounts.poultry}
                          </span>
                          <div
                            className="w-full max-w-[32px] bg-[#0284C7] rounded-t-xl transition-all duration-700"
                            style={{
                              height: `${Math.max(
                                24,
                                ((stats.categoryCounts.poultry || 0) /
                                  Math.max(1, stats.totalProducts)) *
                                100
                              )}px`,
                            }}
                          ></div>
                          <span className="text-[10px] font-semibold text-[#7A98A8] dark:text-[#6C8A9B] truncate w-full text-center">
                            Poulet
                          </span>
                        </div>

                        {/* Bar 3: Vegetables */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-[#10B981] dark:text-[#34D399] tabular-nums">
                            {stats.categoryCounts.vegetables}
                          </span>
                          <div
                            className="w-full max-w-[32px] bg-[#10B981] rounded-t-xl transition-all duration-700"
                            style={{
                              height: `${Math.max(
                                18,
                                ((stats.categoryCounts.vegetables || 0) /
                                  Math.max(1, stats.totalProducts)) *
                                100
                              )}px`,
                            }}
                          ></div>
                          <span className="text-[10px] font-semibold text-[#7A98A8] dark:text-[#6C8A9B] truncate w-full text-center">
                            Légumes
                          </span>
                        </div>

                        {/* Bar 4: Orders Activity */}
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-indigo-500 tabular-nums">
                            {stats.totalOrders}
                          </span>
                          <div
                            className="w-full max-w-[32px] bg-indigo-500 rounded-t-xl transition-all duration-700"
                            style={{ height: '42px' }}
                          ></div>
                          <span className="text-[10px] font-semibold text-[#7A98A8] dark:text-[#6C8A9B] truncate w-full text-center">
                            Ventes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Card: Recent Orders / Reviews (SON YAPILAN YORUMLAR in design) */}
                  <div className="lg:col-span-5 bg-white dark:bg-[#12222B] rounded-[28px] border border-[#E1EDF3] dark:border-[#1E3444] p-6 space-y-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EDF4F8] dark:border-[#1E3444]">
                      <div>
                        <h2 className="font-display font-bold text-base text-[#132E3F] dark:text-[#EEF6FA]">
                          DERNIÈRES COMMANDES
                        </h2>
                        <div className="text-[11px] text-[#7A98A8] dark:text-[#6C8A9B]">
                          Commandes récentes des clients
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1"
                      >
                        <span>Tout voir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[280px] pe-1">
                      {orders.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#7A98A8] space-y-2">
                          <ShoppingCart className="w-8 h-8 text-[#CFE0EB] mx-auto" />
                          <p>Aucune commande enregistrée pour le moment.</p>
                        </div>
                      ) : (
                        orders.slice(0, 4).map((ord) => {
                          const initials = ord.customer_name
                            ? ord.customer_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                            : 'CL';
                          return (
                            <div
                              key={ord.id}
                              onClick={() => setActiveTab('orders')}
                              className="p-3.5 rounded-2xl bg-[#F8FBFD] dark:bg-[#0E1A22] border border-[#E8F1F6] dark:border-[#1A2E3B] hover:border-[#0284C7]/40 cursor-pointer transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-[#132E3F] dark:text-[#EEF6FA] truncate">
                                      {ord.customer_name}
                                    </div>
                                    <div className="text-[10px] text-[#7A98A8] truncate">
                                      {ord.city} · {new Date(ord.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-end shrink-0">
                                  <div className="text-xs font-extrabold text-[#0284C7] dark:text-[#38BDF8] tabular-nums">
                                    {formatMad(ord.total_mad, lang)}
                                  </div>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${ORDER_STATUS_STYLES[ord.status]}`}
                                  >
                                    {ord.status}
                                  </span>
                                </div>
                              </div>

                              {/* Order items note */}
                              {ord.items && ord.items.length > 0 && (
                                <div className="text-[11px] text-[#5A7888] dark:text-[#8AA4B4] bg-white dark:bg-[#12222B] px-2.5 py-1.5 rounded-xl border border-[#EDF4F8] dark:border-[#1E3444] truncate">
                                  {ord.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: 4 Vibrant Gradient Action Cards (PUSULA / Quick Navigation in screenshot) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A98A8] dark:text-[#6C8A9B]">
                      <span>ACCÈS RAPIDE AUX MODULES</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Cyan / Emerald Gradient */}
                    <div
                      onClick={() => setActiveTab('products')}
                      className="group cursor-pointer p-5 rounded-[24px] bg-gradient-to-br from-[#00C9A7] via-[#00BFA5] to-[#0096C7] text-white shadow-md shadow-emerald-500/15 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-36"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm tracking-wide">
                          Catalogue Produits
                        </div>
                        <div className="text-xs text-white/80 mt-0.5">
                          {stats.totalProducts} produits en ligne
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Pink / Magenta / Rose Gradient */}
                    <div
                      onClick={() => setActiveTab('orders')}
                      className="group cursor-pointer p-5 rounded-[24px] bg-gradient-to-br from-[#FF577F] via-[#FF4071] to-[#E0245E] text-white shadow-md shadow-rose-500/15 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-36"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm tracking-wide">
                          Commandes Clients
                        </div>
                        <div className="text-xs text-white/80 mt-0.5">
                          {stats.totalOrders} commandes passées
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Royal Blue / Indigo Gradient */}
                    <div
                      onClick={() => setActiveTab('content')}
                      className="group cursor-pointer p-5 rounded-[24px] bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white shadow-md shadow-blue-500/15 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-36"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Sliders className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm tracking-wide">
                          Contenu &amp; Contacts
                        </div>
                        <div className="text-xs text-white/80 mt-0.5">
                          Textes, livraison &amp; EmailJS
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Sky / Cyan Gradient */}
                    <div
                      onClick={() => setActiveTab('sql')}
                      className="group cursor-pointer p-5 rounded-[24px] bg-gradient-to-br from-[#06B6D4] via-[#0284C7] to-[#0369A1] text-white shadow-md shadow-cyan-500/15 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col justify-between h-36"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm tracking-wide">
                          Supabase SQL
                        </div>
                        <div className="text-xs text-white/80 mt-0.5">
                          Base de données connectée
                        </div>
                      </div>
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
                        className="w-4 h-4 text-[#7A98A8] absolute start-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un produit…"
                        aria-label="Rechercher un produit"
                        className="ps-9 pe-3 py-2 text-sm rounded-xl border border-[#1E3444] bg-[#0B151C] text-[#EEF6FA] placeholder-[#557182] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as 'all' | ProductCategory)}
                      aria-label="Filtrer par catégorie"
                      className="px-3.5 py-2 text-sm rounded-xl border border-[#1E3444] bg-[#0B151C] text-[#EEF6FA] focus:outline-none focus:border-sky-500"
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>{t.admin.addProduct}</span>
                  </button>
                </div>

                {showProductForm && (
                  <form
                    onSubmit={handleSaveProduct}
                    className="bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 space-y-5 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold text-[#EEF6FA]">
                        {productForm.id ? t.admin.editProduct : t.admin.addProduct}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowProductForm(false)}
                        className="text-xs font-semibold text-[#7A98A8] hover:text-[#EEF6FA] transition-colors"
                      >
                        {t.common.cancel}
                      </button>
                    </div>

                    {productError && (
                      <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs font-medium">
                        {productError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">Catégorie</label>
                        <select
                          value={productForm.category}
                          onChange={(e) =>
                            setProductForm((prev) => ({
                              ...prev,
                              category: e.target.value as ProductCategory,
                            }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        >
                          <option value="vegetables">{t.nav.vegetables}</option>
                          <option value="olive-oil">{t.nav.oliveOil}</option>
                          <option value="poultry">{t.nav.poultry}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          Sous-catégorie
                        </label>
                        <input
                          type="text"
                          value={productForm.subcategory}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, subcategory: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                            Prix (MAD) *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={productForm.price_mad}
                            onChange={(e) =>
                              setProductForm((prev) => ({ ...prev, price_mad: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#8AA4B4] mb-1">Stock</label>
                          <input
                            type="number"
                            min="0"
                            value={productForm.stock}
                            onChange={(e) =>
                              setProductForm((prev) => ({ ...prev, stock: e.target.value }))
                            }
                            className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white tabular-nums"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          Nom (FR) *
                        </label>
                        <input
                          type="text"
                          value={productForm.name_fr}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, name_fr: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">Nom (EN)</label>
                        <input
                          type="text"
                          value={productForm.name_en}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, name_en: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          الاسم (AR)
                        </label>
                        <input
                          type="text"
                          dir="rtl"
                          value={productForm.name_ar}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, name_ar: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          Description (FR)
                        </label>
                        <textarea
                          rows={2}
                          value={productForm.desc_fr}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, desc_fr: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          Description (EN)
                        </label>
                        <textarea
                          rows={2}
                          value={productForm.desc_en}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, desc_en: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                          الوصف (AR)
                        </label>
                        <textarea
                          rows={2}
                          dir="rtl"
                          value={productForm.desc_ar}
                          onChange={(e) =>
                            setProductForm((prev) => ({ ...prev, desc_ar: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                        />
                      </div>
                    </div>

                    {/* Image Upload & Preset Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-6 space-y-2">
                        <label className="block text-xs font-medium text-[#8AA4B4]">
                          Image URL ou Téléchargement
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={productForm.image_url}
                            onChange={(e) =>
                              setProductForm((prev) => ({ ...prev, image_url: e.target.value }))
                            }
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                          />
                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0284C7] text-[#38BDF8] text-xs font-semibold cursor-pointer hover:bg-sky-500/10 whitespace-nowrap transition-colors">
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
                                className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${isSelected
                                  ? 'border-[#0284C7] bg-[#0284C7]/20 text-[#38BDF8] font-semibold'
                                  : 'border-[#1E3444] text-[#7A98A8] hover:bg-[#162833]'
                                  }`}
                              >
                                {img.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-6">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#EEF6FA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.available}
                            onChange={(e) =>
                              setProductForm((prev) => ({ ...prev, available: e.target.checked }))
                            }
                            className="rounded border-[#1E3444] text-[#0284C7] focus:ring-0"
                          />
                          <span>Actif (Disponible)</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#EEF6FA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.featured}
                            onChange={(e) =>
                              setProductForm((prev) => ({ ...prev, featured: e.target.checked }))
                            }
                            className="rounded border-[#1E3444] text-[#0284C7] focus:ring-0"
                          />
                          <span>Mis en avant</span>
                        </label>
                      </div>

                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          disabled={savingProduct}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-sm font-semibold shadow-md shadow-sky-500/20"
                        >
                          {savingProduct ? t.common.loading : t.common.save}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Products Table (Aligned with Dashboard Theme) */}
                <div className="bg-[#12222B] rounded-2xl border border-[#1E3444] overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#0E1A22] border-b border-[#1E3444] text-xs font-semibold text-[#7A98A8] uppercase tracking-wider">
                          <th className="py-3.5 px-4 text-start">Produit</th>
                          <th className="py-3.5 px-4 text-start">Catégorie</th>
                          <th className="py-3.5 px-4 text-end">Prix</th>
                          <th className="py-3.5 px-4 text-end">Stock</th>
                          <th className="py-3.5 px-4 text-start">Statut</th>
                          <th className="py-3.5 px-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A2E3B] text-[#C5D9E5]">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-[#162833] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#0B151C] border border-[#1E3444] shrink-0">
                                  <ResilientImage
                                    src={p.image_url}
                                    alt={p.name_fr}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-[#EEF6FA]">
                                    {getLocalizedField(p, 'name', lang)}
                                  </div>
                                  <div className="text-xs text-[#7A98A8]">
                                    {getLocalizedField(p, 'unit', lang)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#8AA4B4]">{p.category}</td>
                            <td className="py-3 px-4 text-end font-semibold text-[#EEF6FA] tabular-nums">
                              {formatMad(p.price_mad, lang)}
                            </td>
                            <td className="py-3 px-4 text-end font-mono tabular-nums text-[#38BDF8]">{p.stock}</td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleProductAvailability(p)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${p.available
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                  }`}
                              >
                                {p.available ? 'Actif' : 'Masqué'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-end">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={`Modifier ${p.name_fr}`}
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
                                  className="p-1.5 rounded-lg border border-[#1E3444] bg-[#0B151C] hover:bg-[#1A2E3B] text-[#7A98A8] hover:text-[#38BDF8] transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Supprimer ${p.name_fr}`}
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 rounded-lg border border-[#1E3444] bg-[#0B151C] hover:bg-red-950/40 text-red-400 transition-colors"
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
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        onClick={() => {
                          setOrderStatusFilter(statusKey);
                          setOrderPage(1);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${orderStatusFilter === statusKey
                          ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-md shadow-sky-500/20'
                          : 'bg-[#12222B] text-[#7A98A8] border-[#1E3444] hover:bg-[#162833] hover:text-[#EEF6FA]'
                          }`}
                      >
                        {statusKey}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7A98A8]">
                      <Calendar className="w-4 h-4 text-sky-400" />
                      <span>Année :</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0B151C] border border-[#1E3444] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOrderYearFilter('all');
                          setOrderPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${orderYearFilter === 'all'
                          ? 'bg-[#0284C7] text-white shadow-xs'
                          : 'text-[#7A98A8] hover:text-[#EEF6FA]'
                          }`}
                      >
                        Toutes
                      </button>
                      {(availableOrderYears.length > 0
                        ? availableOrderYears
                        : [String(new Date().getFullYear())]
                      ).map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setOrderYearFilter(yr);
                            setOrderPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${orderYearFilter === yr
                            ? 'bg-[#0284C7] text-white shadow-xs'
                            : 'text-[#7A98A8] hover:text-[#EEF6FA]'
                            }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#12222B] rounded-2xl border border-[#1E3444] overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#0E1A22] border-b border-[#1E3444] text-xs font-semibold text-[#7A98A8] uppercase tracking-wider">
                          <th className="py-3.5 px-4 text-start">Commande</th>
                          <th className="py-3.5 px-4 text-start">Client</th>
                          <th className="py-3.5 px-4 text-start">Articles</th>
                          <th className="py-3.5 px-4 text-start">Alerte Email</th>
                          <th className="py-3.5 px-4 text-end">Total</th>
                          <th className="py-3.5 px-4 text-start">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A2E3B] text-[#C5D9E5]">
                        {paginatedOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-sm text-[#7A98A8]">
                              Aucune commande trouvée pour ces critères.
                            </td>
                          </tr>
                        ) : (
                          paginatedOrders.map((ord) => (
                            <tr key={ord.id} className="align-top hover:bg-[#162833] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-xs font-semibold text-[#EEF6FA] tabular-nums">{ord.id}</div>
                                <div className="text-xs text-[#7A98A8] mt-0.5">
                                  {new Date(ord.created_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 space-y-0.5">
                                <div className="font-semibold text-[#EEF6FA]">{ord.customer_name}</div>
                                <div className="text-xs text-[#38BDF8] font-mono tabular-nums" dir="ltr">
                                  {ord.customer_phone}
                                </div>
                                <div className="text-xs text-[#7A98A8]">
                                  {ord.city} · {ord.address}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <ul className="space-y-1 text-xs text-[#C5D9E5]">
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
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ord.email_status === 'sent'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : ord.email_status === 'failed'
                                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    }`}
                                >
                                  {ord.email_status === 'sent'
                                    ? 'Envoyé'
                                    : ord.email_status === 'failed'
                                      ? 'Échoué'
                                      : ord.email_status === 'pending_smtp'
                                        ? 'En attente SMTP'
                                        : 'En attente EmailJS'}
                                </span>
                                <div className="text-xs text-[#7A98A8] font-mono" dir="ltr">
                                  {ord.email_recipient || 'domaineessaoudi@gmail.com'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-end font-bold text-[#EEF6FA] tabular-nums">
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
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#1E3444] bg-[#0B151C] text-white focus:outline-none"
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
                                    aria-label={`Supprimer commande ${ord.id}`}
                                    onClick={() => handleDeleteOrder(ord.id)}
                                    className="p-1.5 rounded-lg border border-[#1E3444] bg-[#0B151C] hover:bg-red-950/40 text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {filteredOrders.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-[#12222B] rounded-2xl border border-[#1E3444] shadow-md">
                    <div className="text-xs text-[#7A98A8]">
                      Affichage de{' '}
                      <span className="font-semibold text-[#EEF6FA]">
                        {(currentPage - 1) * ordersPerPage + 1}
                      </span>{' '}
                      à{' '}
                      <span className="font-semibold text-[#EEF6FA]">
                        {Math.min(currentPage * ordersPerPage, filteredOrders.length)}
                      </span>{' '}
                      sur <span className="font-semibold text-[#EEF6FA]">{filteredOrders.length}</span>{' '}
                      commandes
                    </div>

                    {totalOrderPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          aria-label="Page précédente"
                          className="p-1.5 rounded-lg border border-[#1E3444] bg-[#0B151C] text-[#7A98A8] hover:text-[#EEF6FA] hover:bg-[#162833] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              type="button"
                              onClick={() => setOrderPage(pg)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold border transition-colors ${currentPage === pg
                                ? 'bg-[#0284C7] text-white border-[#0284C7]'
                                : 'bg-[#0B151C] text-[#7A98A8] border-[#1E3444] hover:bg-[#162833] hover:text-[#EEF6FA]'
                                }`}
                            >
                              {pg}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                          disabled={currentPage === totalOrderPages}
                          aria-label="Page suivante"
                          className="p-1.5 rounded-lg border border-[#1E3444] bg-[#0B151C] text-[#7A98A8] hover:text-[#EEF6FA] hover:bg-[#162833] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CONTENT & INQUIRIES TAB */}
            {activeTab === 'content' && contentForm && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleSaveSiteContent}
                  className="lg:col-span-7 bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 sm:p-7 space-y-6 shadow-lg"
                >
                  <h2 className="font-display text-lg font-semibold text-[#EEF6FA]">
                    Contenu du Site &amp; Coordonnées
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                        Téléphone Domaine (+212)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={contentForm.phone}
                        onChange={(e) =>
                          setContentForm((prev) => (prev ? { ...prev, phone: e.target.value } : prev))
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                        WhatsApp (+212)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={contentForm.whatsapp}
                        onChange={(e) =>
                          setContentForm((prev) => (prev ? { ...prev, whatsapp: e.target.value } : prev))
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="admin-order-email"
                        className="block text-xs font-medium text-[#8AA4B4] mb-1"
                      >
                        Email Réception Commandes
                      </label>
                      <input
                        id="admin-order-email"
                        type="email"
                        dir="ltr"
                        value={contentForm.email}
                        onChange={(e) =>
                          setContentForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="admin-social-instagram"
                        className="block text-xs font-medium text-[#8AA4B4] mb-1"
                      >
                        URL Instagram
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
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="admin-social-facebook"
                        className="block text-xs font-medium text-[#8AA4B4] mb-1"
                      >
                        URL Facebook
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
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1E3444] bg-[#0B151C] p-4 sm:p-5 space-y-4">
                    {(() => {
                      const ej = resolveEmailJsConfig(contentForm);
                      const isReady = ej.configured || Boolean(emailStatus?.configured);
                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#EEF6FA]">
                              <Mail className="w-4 h-4 text-sky-400" aria-hidden="true" />
                              <span>EmailJS Commandes → {ej.recipientEmail}</span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${isReady
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}
                            >
                              {ej.configured
                                ? 'EmailJS Actif'
                                : emailStatus?.smtpConfigured
                                  ? 'SMTP Actif'
                                  : 'Identifiants EmailJS requis'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label
                                htmlFor="admin-emailjs-service"
                                className="block text-xs font-medium text-[#8AA4B4] mb-1"
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
                                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#12222B] text-white"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-emailjs-template"
                                className="block text-xs font-medium text-[#8AA4B4] mb-1"
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
                                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#12222B] text-white"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="admin-emailjs-key"
                                className="block text-xs font-medium text-[#8AA4B4] mb-1"
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
                                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#1E3444] bg-[#12222B] text-white"
                              />
                            </div>
                          </div>

                          <p className="text-xs text-[#7A98A8] leading-relaxed">
                            Variables envoyées au template EmailJS :{' '}
                            <code className="text-[#38BDF8]">
                              {'{{to_email}}, {{order_id}}, {{customer_name}}, {{customer_phone}}, {{city}}, {{address}}, {{items_summary}}, {{total_mad}}, {{message}}'}
                            </code>
                          </p>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={sendingTestEmail}
                              onClick={handleSendTestEmail}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#1E3444] bg-[#12222B] text-[#EEF6FA] hover:bg-[#162833] disabled:opacity-60 text-xs font-semibold transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                              <span>
                                {sendingTestEmail ? t.common.loading : 'Tester l’envoi EmailJS'}
                              </span>
                            </button>
                            {testEmailResult && (
                              <span
                                className={`text-xs font-medium ${testEmailResult.sent ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                              >
                                {testEmailResult.sent
                                  ? `Envoyé via EmailJS à ${testEmailResult.recipient}`
                                  : testEmailResult.error || `Échec d’envoi pour ${testEmailResult.recipient}`}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                        Titre Hero (FR)
                      </label>
                      <input
                        type="text"
                        value={contentForm.heroTitle_fr}
                        onChange={(e) =>
                          setContentForm((prev) =>
                            prev ? { ...prev, heroTitle_fr: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                        Titre Hero (EN)
                      </label>
                      <input
                        type="text"
                        value={contentForm.heroTitle_en}
                        onChange={(e) =>
                          setContentForm((prev) =>
                            prev ? { ...prev, heroTitle_en: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8AA4B4] mb-1">
                        العنوان الرئيسي (AR)
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
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1E3444] bg-[#0B151C] text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingContent}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white text-sm font-semibold shadow-md shadow-sky-500/20"
                  >
                    {savingContent ? t.common.loading : t.common.save}
                  </button>
                </form>

                <div className="lg:col-span-5 bg-[#12222B] rounded-2xl border border-[#1E3444] p-6 space-y-4 shadow-lg">
                  <h2 className="font-display text-lg font-semibold text-[#EEF6FA]">
                    Messages &amp; Contact ({messages.length})
                  </h2>
                  {messages.length === 0 ? (
                    <p className="text-sm text-[#7A98A8]">Aucun message pour le moment.</p>
                  ) : (
                    <div className="divide-y divide-[#1A2E3B] space-y-3">
                      {messages.map((m) => (
                        <div key={m.id} className="pt-3 first:pt-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-[#EEF6FA]">{m.name}</span>
                            <span className="text-xs font-mono text-[#38BDF8]">{m.status}</span>
                          </div>
                          <div className="text-xs text-[#7A98A8] font-mono" dir="ltr">
                            {m.phone}
                          </div>
                          <div className="text-xs font-semibold text-[#C5D9E5]">{m.subject}</div>
                          <p className="text-xs text-[#7A98A8] leading-relaxed">{m.message}</p>
                          {m.status === 'unread' && (
                            <button
                              type="button"
                              onClick={() => handleMessageStatus(m.id, 'read')}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#38BDF8] hover:underline pt-1"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Marquer comme lu</span>
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
          </main>
        </div>
      </div>
    </div>
  );
}
