// Types de base pour le Catalogue GMI V1

export type UserRole = 'super_admin' | 'admin' | 'staff';

export type ProductStatus = 'actif' | 'a_verifier' | 'archive';

export type ImageViewType = 
  | 'principale'
  | 'carton_exterieur'
  | 'interieur_carton'
  | 'produit_deballe'
  | 'etiquette_reference'
  | 'details_techniques'
  | 'accessoires'
  | 'autre';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PriceType {
  code: string; // 'detail' | 'gros' | 'revendeur' | 'achat'
  label: string;
  description?: string;
  is_confidential: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  is_default: boolean;
  specific_features?: string;
  color?: string;
  capacity?: string;
  size_format?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductPackage {
  id: string;
  product_id: string;
  variant_id?: string;
  package_type: string; // 'unite' | 'piece' | 'paquet' | 'carton' | 'lot' | 'rouleau' | 'litre' | 'kg'
  package_label: string; // ex: 'Carton de 10 paquets'
  units_per_package: number;
  is_base_unit: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  variant_id?: string;
  package_id?: string;
  price_type_code: string;
  amount_xof: number;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  variant_id?: string;
  package_id?: string;
  price_type_code: string;
  old_amount_xof?: number;
  new_amount_xof: number;
  changed_by?: string;
  changed_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id?: string;
  storage_path: string;
  public_url?: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  view_type: ImageViewType;
  caption?: string;
  is_primary: boolean;
  order_index: number;
  uploaded_by?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  internal_code: string;
  legacy_reference?: string;
  name: string;
  category_id: string;
  category?: Category;
  brand?: string;
  model_reference?: string;
  alternative_names: string[];
  search_keywords: string[];
  short_description?: string;
  detailed_presentation?: string;
  product_usage?: string;
  technical_specs?: string;
  precautions?: string;
  status: ProductStatus;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Relations enrichies
  primary_image?: ProductImage;
  images?: ProductImage[];
  variants?: ProductVariant[];
  packages?: ProductPackage[];
  prices?: ProductPrice[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_protected: boolean;
  created_at: string;
  updated_at: string;
  permissions?: string[];
}

export interface AuditEvent {
  id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface LegacyImportBatch {
  id: string;
  imported_by?: string;
  filename: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_summary?: string;
  created_at: string;
}

export type PermissionKey =
  | 'catalog:view'
  | 'product:create'
  | 'product:edit'
  | 'product:archive'
  | 'photo:manage'
  | 'category:manage'
  | 'price:view:achat'
  | 'price:view:gros'
  | 'price:view:revendeur'
  | 'price:edit:detail'
  | 'price:edit:achat'
  | 'price:edit:gros'
  | 'price:edit:revendeur'
  | 'user:manage'
  | 'permission:manage'
  | 'import:execute';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'Catalogue' | 'Produits' | 'Photographies' | 'Tarifs' | 'Administration';
  description: string;
}
