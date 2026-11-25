export type Language = 'fr' | 'en' | 'ar';

export type ProductCategory = 'vegetables' | 'olive-oil' | 'poultry';

export interface ProductVariant {
  id: string;
  label_fr: string;
  label_en: string;
  label_ar: string;
  price_mad: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  subcategory: string;
  name_fr: string;
  name_en: string;
  name_ar: string;
  desc_fr: string;
  desc_en: string;
  desc_ar: string;
  price_mad: number;
  unit_fr: string;
  unit_en: string;
  unit_ar: string;
  stock: number;
  available: boolean;
  featured: boolean;
  image_url: string;
  variants: ProductVariant[];
  harvest_note_fr: string;
  harvest_note_en: string;
  harvest_note_ar: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name_fr: string;
  name_en: string;
  name_ar: string;
  unit_fr: string;
  unit_en: string;
  unit_ar: string;
  price_mad: number;
  quantity: number;
  image_url: string;
  maxStock: number;
}

export interface DeliveryZone {
  id: string;
  name_fr: string;
  name_en: string;
  name_ar: string;
  fee_mad: number;
  free_threshold_mad: number;
  eta_fr: string;
  eta_en: string;
  eta_ar: string;
}

export interface OrderItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface OrderItemSummary {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  name: string;
  price_mad: number;
  quantity: number;
  line_total_mad: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  city: string;
  delivery_zone: string;
  address: string;
  delivery_method: 'delivery' | 'pickup';
  delivery_fee_mad: number;
  subtotal_mad: number;
  total_mad: number;
  notes?: string;
  status: OrderStatus;
  email_status?: 'sent' | 'pending_smtp' | 'pending_emailjs' | 'failed';
  email_recipient?: string;
  items: OrderItemSummary[];
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role_fr: string;
  role_en: string;
  role_ar: string;
  city: string;
  quote_fr: string;
  quote_en: string;
  quote_ar: string;
}

export interface SiteContent {
  farmName: string;
  heroTitle_fr: string;
  heroTitle_en: string;
  heroTitle_ar: string;
  heroSubtitle_fr: string;
  heroSubtitle_en: string;
  heroSubtitle_ar: string;
  phone: string;
  whatsapp: string;
  email: string;
  address_fr: string;
  address_en: string;
  address_ar: string;
  hours_fr: string;
  hours_en: string;
  hours_ar: string;
  deliveryZones: DeliveryZone[];
  testimonials: Testimonial[];
  socialInstagram: string;
  socialFacebook: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
}

export interface AdminStats {
  totalProducts: number;
  availableProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenueMad: number;
  unreadMessages: number;
  categoryCounts: Record<ProductCategory, number>;
  recentOrders: Order[];
}
