import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, type Translations } from '../i18n/translations';
import type { CartItem, Language, Product, ProductVariant, SiteContent } from '../types';
import { getLocalizedField } from '../utils/commerce';

interface AppContextValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Language) => void;
  t: Translations;
  products: Product[];
  productsLoading: boolean;
  refreshProducts: () => Promise<void>;
  siteContent: SiteContent | null;
  refreshSiteContent: () => Promise<void>;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  updateCartQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string | undefined) => void;
  clearCart: () => void;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  route: string;
  navigate: (path: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_STORAGE_KEY = 'domaine_essaoudi_cart_v1';
const LANG_STORAGE_KEY = 'domaine_essaoudi_lang_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'fr' || saved === 'en' || saved === 'ar') return saved;
    } catch {
      // ignore storage errors
    }
    return 'fr';
  });

  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Security rule: admin bearer session stays strictly in React memory (never localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang, dir]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const refreshSiteContent = useCallback(async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        if (data.content) setSiteContent(data.content);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    refreshSiteContent();
  }, [refreshProducts, refreshSiteContent]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
  }, []);

  const addToCart = useCallback(
    (product: Product, quantity = 1, variant?: ProductVariant) => {
      const activeVariant = variant || product.variants[0];
      const unitPrice = activeVariant ? activeVariant.price_mad : product.price_mad;
      const maxStock = activeVariant ? Math.min(product.stock, activeVariant.stock) : product.stock;
      const variantLabel = activeVariant
        ? getLocalizedField(activeVariant, 'label', lang)
        : undefined;

      setCart((prev) => {
        const idx = prev.findIndex(
          (c) => c.productId === product.id && c.variantId === activeVariant?.id
        );
        if (idx >= 0) {
          const next = [...prev];
          const updatedQty = Math.min(maxStock, next[idx].quantity + quantity);
          next[idx] = { ...next[idx], quantity: updatedQty };
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            variantId: activeVariant?.id,
            variantLabel,
            name_fr: product.name_fr,
            name_en: product.name_en,
            name_ar: product.name_ar,
            unit_fr: product.unit_fr,
            unit_en: product.unit_en,
            unit_ar: product.unit_ar,
            price_mad: unitPrice,
            quantity: Math.min(maxStock, Math.max(1, quantity)),
            image_url: product.image_url,
            maxStock,
          },
        ];
      });
      showToast(t.common.added);
    },
    [lang, showToast, t.common.added]
  );

  const updateCartQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.productId === productId && item.variantId === variantId) {
              if (quantity <= 0) return null;
              return { ...item, quantity: Math.min(item.maxStock, quantity) };
            }
            return item;
          })
          .filter(Boolean) as CartItem[]
      );
    },
    []
  );

  const removeFromCart = useCallback(
    (productId: string, variantId: string | undefined) => {
      setCart((prev) =>
        prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        lang,
        dir,
        setLang,
        t,
        products,
        productsLoading,
        refreshProducts,
        siteContent,
        refreshSiteContent,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        adminToken,
        setAdminToken,
        toastMessage,
        showToast,
        route,
        navigate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
