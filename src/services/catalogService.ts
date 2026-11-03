import { Product, ProductStatus, ProductPrice, ProductImage, ProductVariant, ProductPackage, Category, PermissionKey } from '../types';
import { INITIAL_PRODUCTS, MOCK_CATEGORIES } from '../lib/mockData';
import { isSupabaseConfigured, supabase, ensureFreshSession } from '../lib/supabase';

const PRODUCTS_STORAGE_KEY = 'gmi_catalog_products_v1';
const CATEGORIES_STORAGE_KEY = 'gmi_catalog_categories_v1';

// Initialisation du stockage local si nécessaire
function getLocalProducts(): Product[] {
  const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // En cas de format invalide
    }
  }
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

function saveLocalProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

function getLocalCategories(): Category[] {
  const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(MOCK_CATEGORIES));
  return MOCK_CATEGORIES;
}

function saveLocalCategories(cats: Category[]): void {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
}

// Fonction utilitaire pour filtrer les prix selon les permissions de l'utilisateur
export function filterAuthorizedPrices(
  prices: ProductPrice[] | undefined,
  hasPermission: (perm: PermissionKey) => boolean,
  isSuperAdmin: boolean
): ProductPrice[] {
  if (!prices) return [];
  if (isSuperAdmin) return prices;

  return prices.filter((price) => {
    if (price.price_type_code === 'detail') {
      return hasPermission('catalog:view');
    }
    const permKey = `price:view:${price.price_type_code}` as PermissionKey;
    return hasPermission(permKey);
  });
}

// Générateur automatique de code interne GMI (ex: GMI-IMP-007)
export function generateInternalCode(categoryName: string, existingProducts: Product[]): string {
  let prefix = 'DIV';
  const lowerCat = categoryName.toLowerCase();
  if (lowerCat.includes('imprimerie')) {
    prefix = 'IMP';
  } else if (lowerCat.includes('sérigraphie') || lowerCat.includes('serigraphie')) {
    prefix = 'SER';
  }

  const matchingCodes = existingProducts
    .map(p => p.internal_code)
    .filter(c => c && c.startsWith(`GMI-${prefix}-`));

  let maxNum = 0;
  for (const code of matchingCodes) {
    const parts = code.split('-');
    const numPart = parseInt(parts[2], 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }

  const nextNum = (maxNum + 1).toString().padStart(3, '0');
  return `GMI-${prefix}-${nextNum}`;
}

// Associer les URLs publiques Supabase Storage aux images
export function attachPublicUrls(images: any[] = []): ProductImage[] {
  return images.map(img => {
    let publicUrl = img.public_url;
    if (!publicUrl && img.storage_path && isSupabaseConfigured) {
      const { data } = supabase.storage.from('product-images').getPublicUrl(img.storage_path);
      publicUrl = data?.publicUrl;
    }
    return {
      ...img,
      public_url: publicUrl || img.storage_path,
    };
  }).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

// Convertir un format DataURL base64 en Blob pour upload direct vers Supabase Storage
export async function convertDataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; mimeType: string }> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, mimeType: blob.type || 'image/jpeg' };
  } catch {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return { blob: new Blob([u8arr], { type: mimeType }), mimeType };
  }
}

export const catalogService = {
  // Récupérer les catégories
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return getLocalCategories();
  },

  // Récupérer les produits avec filtrage et recherche
  async getProducts(params: {
    categoryId?: string;
    search?: string;
    status?: ProductStatus | 'all';
    hasPermission: (perm: PermissionKey) => boolean;
    isSuperAdmin: boolean;
  }): Promise<Product[]> {
    let products: Product[] = [];

    if (isSupabaseConfigured) {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*),
          packages:product_packages(*),
          prices:product_prices(*)
        `);

      if (params.categoryId && params.categoryId !== 'all') {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      } else if (!params.status) {
        query = query.neq('status', 'archive'); // Par défaut, exclure les archivés
      }

      const { data, error } = await query;
      if (error) throw error;

      products = (data || []).map((p: any) => {
        const sortedImages = attachPublicUrls(p.images);
        return {
          ...p,
          images: sortedImages,
          primary_image: sortedImages.find((img: any) => img.is_primary) || sortedImages[0],
        };
      });
    } else {
      // Mode local
      products = getLocalProducts();
      const categories = getLocalCategories();
      const catMap = new Map(categories.map(c => [c.id, c]));

      products = products.map(p => ({
        ...p,
        category: catMap.get(p.category_id),
      }));

      // Filtre statut
      if (params.status && params.status !== 'all') {
        products = products.filter(p => p.status === params.status);
      } else if (!params.status) {
        products = products.filter(p => p.status !== 'archive');
      }

      // Filtre catégorie
      if (params.categoryId && params.categoryId !== 'all') {
        products = products.filter(p => p.category_id === params.categoryId);
      }
    }

    // Recherche textuelle multi-champs (nom, code interne, ancienne référence, modèle, mots-clés)
    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      products = products.filter(p => {
        const matchName = p.name?.toLowerCase().includes(term);
        const matchCode = p.internal_code?.toLowerCase().includes(term);
        const matchLegacy = p.legacy_reference?.toLowerCase().includes(term);
        const matchBrand = p.brand?.toLowerCase().includes(term);
        const matchModel = p.model_reference?.toLowerCase().includes(term);
        const matchAlt = p.alternative_names?.some(a => a.toLowerCase().includes(term));
        const matchKw = p.search_keywords?.some(k => k.toLowerCase().includes(term));
        return matchName || matchCode || matchLegacy || matchBrand || matchModel || matchAlt || matchKw;
      });
    }

    // Filtrer strictement les tarifs de chaque produit selon les droits
    return products.map(p => ({
      ...p,
      prices: filterAuthorizedPrices(p.prices, params.hasPermission, params.isSuperAdmin),
    }));
  },

  // Récupérer un produit par son ID ou son code interne (ex: GMI-IMP-001)
  async getProductById(
    idOrCode: string,
    hasPermission: (perm: PermissionKey) => boolean,
    isSuperAdmin: boolean
  ): Promise<Product | null> {
    if (!idOrCode) return null;
    let product: Product | null = null;
    const cleanLookup = idOrCode.trim();

    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanLookup);
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*),
          packages:product_packages(*),
          prices:product_prices(*)
        `);

      if (isUuid) {
        query = query.eq('id', cleanLookup);
      } else {
        query = query.ilike('internal_code', cleanLookup);
      }

      let { data, error } = await query.maybeSingle();

      // Si non trouvé par code interne, tenter par ancienne référence
      if (!data && !isUuid) {
        const fallbackRes = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            images:product_images(*),
            variants:product_variants(*),
            packages:product_packages(*),
            prices:product_prices(*)
          `)
          .ilike('legacy_reference', cleanLookup)
          .maybeSingle();
        if (fallbackRes.data) {
          data = fallbackRes.data;
        }
      }

      if (error || !data) return null;
      const sortedImages = attachPublicUrls(data.images);
      product = {
        ...data,
        images: sortedImages,
        primary_image: sortedImages.find((img: any) => img.is_primary) || sortedImages[0],
      };
    } else {
      const products = getLocalProducts();
      const categories = getLocalCategories();
      const catMap = new Map(categories.map(c => [c.id, c]));
      const lower = cleanLookup.toLowerCase();
      const found = products.find(p => 
        p.id === cleanLookup || 
        p.id.toLowerCase() === lower || 
        p.internal_code?.toLowerCase() === lower ||
        p.legacy_reference?.toLowerCase() === lower
      );
      if (!found) return null;
      product = {
        ...found,
        category: catMap.get(found.category_id),
      };
    }

    if (product) {
      product.prices = filterAuthorizedPrices(product.prices, hasPermission, isSuperAdmin);
    }
    return product;
  },

  // Créer un produit
  async createProduct(data: {
    name: string;
    category_id: string;
    brand?: string;
    model_reference?: string;
    legacy_reference?: string;
    alternative_names?: string[];
    search_keywords?: string[];
    short_description?: string;
    detailed_presentation?: string;
    product_usage?: string;
    technical_specs?: string;
    precautions?: string;
    status?: ProductStatus;
    default_variant_sku?: string;
    packages?: Array<{ package_type: string; package_label: string; units_per_package: number }>;
    prices?: Record<string, number>; // code -> montant
    images?: Array<{ url: string; filename: string; view_type: any; caption?: string }>;
    userId?: string;
    internal_code?: string;
  }): Promise<Product> {
    const categories = await this.getCategories();
    const category = categories.find(c => c.id === data.category_id);
    const categoryName = category?.name || 'Articles divers';

    let prefix = 'DIV';
    const lowerCat = categoryName.toLowerCase();
    if (lowerCat.includes('imprimerie')) prefix = 'IMP';
    else if (lowerCat.includes('sérigraphie') || lowerCat.includes('serigraphie')) prefix = 'SER';

    // Déterminer le code interne unique
    let internalCode = data.internal_code;
    if (!internalCode) {
      if (isSupabaseConfigured) {
        internalCode = `GMI-${prefix}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 900 + 100)}`;
      } else {
        const localProducts = getLocalProducts();
        internalCode = generateInternalCode(categoryName, localProducts);
      }
    }

    const newProductId = isSupabaseConfigured ? undefined : `prod-${Date.now()}`;
    const defaultVariantId = `var-${Date.now()}`;

    const defaultVariant: ProductVariant = {
      id: defaultVariantId,
      product_id: newProductId || '',
      sku: data.default_variant_sku || `${internalCode}-STD`,
      variant_name: 'Référence standard',
      is_default: true,
    };

    const newPackages: ProductPackage[] = (data.packages && data.packages.length > 0)
      ? data.packages.map((pkg, idx) => ({
          id: `pkg-${Date.now()}-${idx}`,
          product_id: newProductId || '',
          variant_id: defaultVariantId,
          package_type: pkg.package_type,
          package_label: pkg.package_label,
          units_per_package: pkg.units_per_package,
          is_base_unit: idx === 0,
        }))
      : [
          {
            id: `pkg-${Date.now()}-0`,
            product_id: newProductId || '',
            variant_id: defaultVariantId,
            package_type: 'unite',
            package_label: 'Pièce / Unité',
            units_per_package: 1,
            is_base_unit: true,
          }
        ];

    const newPrices: ProductPrice[] = [];
    if (data.prices) {
      for (const [code, amount] of Object.entries(data.prices)) {
        if (amount !== undefined && amount !== null && !isNaN(amount)) {
          newPrices.push({
            id: `prc-${Date.now()}-${code}`,
            product_id: newProductId || '',
            variant_id: defaultVariantId,
            package_id: newPackages[0].id,
            price_type_code: code,
            amount_xof: Number(amount),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    const newImages: ProductImage[] = (data.images || []).map((img, idx) => ({
      id: `img-${Date.now()}-${idx}`,
      product_id: newProductId || '',
      storage_path: `products/${newProductId}/${img.filename}`,
      public_url: img.url,
      original_filename: img.filename,
      mime_type: 'image/jpeg',
      file_size_bytes: 350000,
      view_type: img.view_type || (idx === 0 ? 'principale' : 'autre'),
      caption: img.caption || '',
      is_primary: idx === 0,
      order_index: idx,
    }));

    const newProduct: Product = {
      id: newProductId || `prod-${Date.now()}`,
      internal_code: internalCode,
      legacy_reference: data.legacy_reference?.trim() || undefined,
      name: data.name.trim(),
      category_id: data.category_id,
      category,
      brand: data.brand?.trim() || undefined,
      model_reference: data.model_reference?.trim() || undefined,
      alternative_names: data.alternative_names || [],
      search_keywords: data.search_keywords || [],
      short_description: data.short_description?.trim() || undefined,
      detailed_presentation: data.detailed_presentation?.trim() || undefined,
      product_usage: data.product_usage?.trim() || undefined,
      technical_specs: data.technical_specs?.trim() || undefined,
      precautions: data.precautions?.trim() || undefined,
      status: data.status || 'actif',
      created_by: data.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      primary_image: newImages.find(img => img.is_primary) || newImages[0],
      images: newImages,
      variants: [defaultVariant],
      packages: newPackages,
      prices: newPrices,
    };

    if (isSupabaseConfigured) {
      await ensureFreshSession();
      // Insertion dans Supabase avec transaction ou cascade
      const { data: insertedProduct, error: prodErr } = await supabase
        .from('products')
        .insert({
          internal_code: internalCode,
          legacy_reference: newProduct.legacy_reference,
          name: newProduct.name,
          category_id: newProduct.category_id,
          brand: newProduct.brand,
          model_reference: newProduct.model_reference,
          alternative_names: newProduct.alternative_names,
          search_keywords: newProduct.search_keywords,
          short_description: newProduct.short_description,
          detailed_presentation: newProduct.detailed_presentation,
          product_usage: newProduct.product_usage,
          technical_specs: newProduct.technical_specs,
          precautions: newProduct.precautions,
          status: newProduct.status,
          created_by: data.userId,
        })
        .select()
        .single();

      if (prodErr) throw prodErr;
      const pid = insertedProduct.id;

      // Créer la variante par défaut
      await supabase.from('product_variants').insert({
        product_id: pid,
        sku: defaultVariant.sku,
        variant_name: defaultVariant.variant_name,
        is_default: true,
      });

      // Créer les packages
      if (newPackages.length > 0) {
        await supabase.from('product_packages').insert(
          newPackages.map(pkg => ({
            product_id: pid,
            package_type: pkg.package_type,
            package_label: pkg.package_label,
            units_per_package: pkg.units_per_package,
            is_base_unit: pkg.is_base_unit,
          }))
        );
      }

      // Créer les prix
      if (newPrices.length > 0) {
        await supabase.from('product_prices').insert(
          newPrices.map(prc => ({
            product_id: pid,
            price_type_code: prc.price_type_code,
            amount_xof: prc.amount_xof,
            updated_by: data.userId,
          }))
        );
      }

      // Téléverser les photos associées dans Supabase Storage & table product_images
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const imgItem = data.images[i];
          try {
            await this.addImage(
              pid,
              (imgItem as any).file || (imgItem as any).dataUrl || (imgItem as any).url || imgItem,
              {
                view_type: imgItem.view_type || (i === 0 ? 'principale' : 'autre'),
                caption: imgItem.caption || '',
                is_primary: i === 0,
              }
            );
          } catch (imgErr) {
            console.error('Erreur téléversement image lors de la création du produit:', imgErr);
          }
        }
      }

      // Recharger le produit complet avec ses images et tarifs
      const completeProduct = await this.getProductById(pid, () => true, true);
      return completeProduct || insertedProduct;
    } else {
      // Stockage local
      const updatedList = [newProduct, ...getLocalProducts()];
      saveLocalProducts(updatedList);
      return newProduct;
    }
  },

  // Mettre à jour un produit
  async updateProduct(
    id: string,
    updates: Partial<Product>,
    prices?: Record<string, number>,
    userId?: string,
    newImages?: Array<{ file?: File; dataUrl?: string; url?: string; filename?: string; view_type?: any; caption?: string }>,
    packages?: Array<{ package_type: string; package_label: string; units_per_package: number }>
  ): Promise<Product> {
    if (isSupabaseConfigured) {
      await ensureFreshSession();
      const { data, error } = await supabase
        .from('products')
        .update({
          name: updates.name,
          category_id: updates.category_id,
          brand: updates.brand !== undefined ? updates.brand : null,
          model_reference: updates.model_reference !== undefined ? updates.model_reference : null,
          legacy_reference: updates.legacy_reference !== undefined ? updates.legacy_reference : null,
          alternative_names: updates.alternative_names || [],
          search_keywords: updates.search_keywords || [],
          short_description: updates.short_description !== undefined ? updates.short_description : null,
          detailed_presentation: updates.detailed_presentation !== undefined ? updates.detailed_presentation : null,
          product_usage: updates.product_usage !== undefined ? updates.product_usage : null,
          technical_specs: updates.technical_specs !== undefined ? updates.technical_specs : null,
          precautions: updates.precautions !== undefined ? updates.precautions : null,
          status: updates.status,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour les prix avec vérification d'existence pour éviter l'erreur 42P10 ON CONFLICT
      if (prices) {
        for (const [code, amount] of Object.entries(prices)) {
          if (amount !== undefined && amount !== null && !isNaN(amount) && amount > 0) {
            const { data: existingPrice } = await supabase
              .from('product_prices')
              .select('id')
              .eq('product_id', id)
              .eq('price_type_code', code)
              .maybeSingle();

            if (existingPrice) {
              await supabase
                .from('product_prices')
                .update({
                  amount_xof: Number(amount),
                  updated_by: userId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingPrice.id);
            } else {
              await supabase
                .from('product_prices')
                .insert({
                  product_id: id,
                  price_type_code: code,
                  amount_xof: Number(amount),
                  updated_by: userId,
                });
            }
          } else if (amount === 0 || amount === null) {
            // Suppression si le montant a été effacé
            await supabase
              .from('product_prices')
              .delete()
              .eq('product_id', id)
              .eq('price_type_code', code);
          }
        }
      }

      // Mettre à jour les conditionnements si fournis
      if (packages && packages.length > 0) {
        await supabase
          .from('product_packages')
          .delete()
          .eq('product_id', id);

        await supabase
          .from('product_packages')
          .insert(
            packages.map((pkg, idx) => ({
              product_id: id,
              package_type: pkg.package_type,
              package_label: pkg.package_label,
              units_per_package: pkg.units_per_package,
              is_base_unit: idx === 0,
            }))
          );
      }

      // Upload des nouvelles photos s'il y en a
      if (newImages && newImages.length > 0) {
        for (const img of newImages) {
          try {
            await this.addImage(
              id,
              (img as any).file || (img as any).dataUrl || (img as any).url || img,
              {
                view_type: img.view_type || 'autre',
                caption: img.caption || '',
                is_primary: img.view_type === 'principale',
              }
            );
          } catch (imgErr) {
            console.error('Erreur téléversement image lors de la modification:', imgErr);
            throw imgErr;
          }
        }
      }

      // Recharger le produit complet avec ses images, catégories et tarifs à jour
      const completeProduct = await this.getProductById(id, () => true, true);
      return completeProduct || data;
    } else {
      const products = getLocalProducts();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Produit non trouvé');

      const existing = products[index];

      // Mettre à jour les prix en local
      let updatedPrices = [...(existing.prices || [])];
      if (prices) {
        for (const [code, amount] of Object.entries(prices)) {
          const prcIdx = updatedPrices.findIndex(p => p.price_type_code === code);
          if (amount !== undefined && amount !== null && !isNaN(amount) && amount > 0) {
            if (prcIdx >= 0) {
              updatedPrices[prcIdx] = {
                ...updatedPrices[prcIdx],
                amount_xof: Number(amount),
                updated_at: new Date().toISOString(),
              };
            } else {
              updatedPrices.push({
                id: `prc-${Date.now()}-${code}`,
                product_id: id,
                price_type_code: code,
                amount_xof: Number(amount),
                updated_at: new Date().toISOString(),
              });
            }
          } else if (amount === 0 || amount === null) {
            if (prcIdx >= 0) {
              updatedPrices.splice(prcIdx, 1);
            }
          }
        }
      }

      // Mettre à jour les packages en local
      let updatedPackages = existing.packages || [];
      if (packages && packages.length > 0) {
        updatedPackages = packages.map((pkg, idx) => ({
          id: `pkg-${Date.now()}-${idx}`,
          product_id: id,
          variant_id: existing.variants?.[0]?.id || '',
          package_type: pkg.package_type,
          package_label: pkg.package_label,
          units_per_package: pkg.units_per_package,
          is_base_unit: idx === 0,
        }));
      }

      const updatedProduct: Product = {
        ...existing,
        ...updates,
        prices: updatedPrices,
        packages: updatedPackages,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      };

      products[index] = updatedProduct;
      saveLocalProducts(products);

      // Upload des nouvelles photos en local
      if (newImages && newImages.length > 0) {
        for (const img of newImages) {
          await this.addImage(
            id,
            (img as any).file || (img as any).dataUrl || (img as any).url || img,
            {
              view_type: img.view_type || 'autre',
              caption: img.caption || '',
              is_primary: img.view_type === 'principale',
            }
          );
        }
      }

      const completeProduct = await this.getProductById(id, () => true, true);
      return completeProduct || updatedProduct;
    }
  },

  // Archiver un produit
  async archiveProduct(id: string, userId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      await ensureFreshSession();
      const { error } = await supabase
        .from('products')
        .update({ status: 'archive', updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', id);
      if (error) throw error;
    } else {
      const products = getLocalProducts();
      const updated = products.map(p => p.id === id ? { ...p, status: 'archive' as ProductStatus } : p);
      saveLocalProducts(updated);
    }
  },

  // Restaurer un produit
  async restoreProduct(id: string, userId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('products')
        .update({ status: 'actif', updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', id);
      if (error) throw error;
    } else {
      const products = getLocalProducts();
      const updated = products.map(p => p.id === id ? { ...p, status: 'actif' as ProductStatus } : p);
      saveLocalProducts(updated);
    }
  },

  // Supprimer définitivement un produit
  async deleteProductPermanently(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      const products = getLocalProducts().filter(p => p.id !== id);
      saveLocalProducts(products);
    }
  },

  // Téléverser une photographie
  async addImage(
    productId: string,
    file: File | Blob | { dataUrl?: string; url?: string; name?: string; filename?: string; file?: File },
    metadata: { view_type: any; caption?: string; is_primary?: boolean }
  ): Promise<ProductImage> {
    const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let publicUrl = '';

    if (isSupabaseConfigured) {
      await ensureFreshSession();

      let uploadBody: File | Blob;
      let filename = 'photo.jpg';
      let mimeType = 'image/jpeg';
      let fileSize = 350000;

      if (file instanceof File) {
        uploadBody = file;
        filename = file.name;
        mimeType = file.type || 'image/jpeg';
        fileSize = file.size;
      } else if (file instanceof Blob) {
        uploadBody = file;
        filename = `photo-${Date.now()}.jpg`;
        mimeType = file.type || 'image/jpeg';
        fileSize = file.size;
      } else if (file && (file as any).file instanceof File) {
        const rawFile = (file as any).file as File;
        uploadBody = rawFile;
        filename = rawFile.name;
        mimeType = rawFile.type || 'image/jpeg';
        fileSize = rawFile.size;
      } else if (file && ((file as any).dataUrl || (file as any).url)) {
        const sourceUrl = (file as any).dataUrl || (file as any).url;
        const converted = await convertDataUrlToBlob(sourceUrl);
        uploadBody = converted.blob;
        filename = (file as any).name || (file as any).filename || `photo-${Date.now()}.jpg`;
        mimeType = converted.mimeType;
        fileSize = converted.blob.size;
      } else {
        throw new Error('Format de fichier image invalide pour le téléversement.');
      }

      // Normaliser le type MIME
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'gif') mimeType = 'image/gif';
        else mimeType = 'image/jpeg';
      }

      const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `products/${productId}/${Date.now()}-${cleanFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, uploadBody, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Erreur Supabase Storage upload:', uploadError);
        throw new Error(`Échec du téléversement vers le stockage Supabase : ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      publicUrl = urlData.publicUrl;

      // Si cette photo est définie comme principale, désactiver l'ancienne principale
      if (metadata.is_primary) {
        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId);
      }

      const { data: imgRow, error: rowError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          storage_path: storagePath,
          original_filename: filename,
          mime_type: mimeType,
          file_size_bytes: fileSize,
          view_type: metadata.view_type || 'autre',
          caption: metadata.caption || '',
          is_primary: metadata.is_primary || false,
        })
        .select()
        .single();

      if (rowError) {
        console.error('Erreur insertion base product_images:', rowError);
        throw new Error(`Image stockée mais enregistrement en base échoué : ${rowError.message}`);
      }

      return { ...imgRow, public_url: publicUrl };
    } else {
      // Local fallback : convertir le fichier en Data URL pour une persistance fiable dans localStorage
      if (file instanceof File || file instanceof Blob) {
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } else {
        publicUrl = (file as any).dataUrl || (file as any).url || '';
      }

      const originalName = (file as any).name || (file as any).filename || (file instanceof File ? file.name : 'photo.jpg');
      const mime = (file as any).type || (file instanceof File ? file.type : 'image/jpeg') || 'image/jpeg';
      const sizeBytes = (file as any).size || (file instanceof File ? file.size : 250000);

      const newImg: ProductImage = {
        id: imageId,
        product_id: productId,
        storage_path: `products/${productId}/${imageId}`,
        public_url: publicUrl,
        original_filename: originalName,
        mime_type: mime,
        file_size_bytes: sizeBytes,
        view_type: metadata.view_type || 'autre',
        caption: metadata.caption || '',
        is_primary: metadata.is_primary || false,
        order_index: 99,
        created_at: new Date().toISOString(),
      };

      const products = getLocalProducts();
      const pIdx = products.findIndex(p => p.id === productId);
      if (pIdx >= 0) {
        const prod = products[pIdx];
        const existingImages = prod.images || [];
        if (metadata.is_primary) {
          existingImages.forEach(img => { img.is_primary = false; });
        }
        prod.images = [...existingImages, newImg];
        if (metadata.is_primary || !prod.primary_image) {
          prod.primary_image = newImg;
        }
        products[pIdx] = prod;
        saveLocalProducts(products);
      }

      return newImg;
    }
  },

  // Définir la photo principale
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);
    } else {
      const products = getLocalProducts();
      const pIdx = products.findIndex(p => p.id === productId);
      if (pIdx >= 0) {
        const prod = products[pIdx];
        if (prod.images) {
          prod.images.forEach(img => {
            img.is_primary = img.id === imageId;
          });
          prod.primary_image = prod.images.find(img => img.id === imageId);
        }
        products[pIdx] = prod;
        saveLocalProducts(products);
      }
    }
  },

  // Supprimer une image
  async deleteImage(productId: string, imageId: string, storagePath?: string): Promise<void> {
    if (isSupabaseConfigured) {
      if (storagePath) {
        await supabase.storage.from('product-images').remove([storagePath]);
      }
      await supabase.from('product_images').delete().eq('id', imageId);
    } else {
      const products = getLocalProducts();
      const pIdx = products.findIndex(p => p.id === productId);
      if (pIdx >= 0) {
        const prod = products[pIdx];
        if (prod.images) {
          prod.images = prod.images.filter(img => img.id !== imageId);
          if (prod.primary_image?.id === imageId) {
            prod.primary_image = prod.images[0];
            if (prod.primary_image) prod.primary_image.is_primary = true;
          }
        }
        products[pIdx] = prod;
        saveLocalProducts(products);
      }
    }
  },

  // Détection de doublons potentiels pour l'import CSV ou l'ajout manuel
  checkDuplicates(name: string, legacyRef?: string): { isDuplicate: boolean; matchedProduct?: Product; reason?: string } {
    const products = getLocalProducts();
    const cleanName = name.trim().toLowerCase();
    const cleanRef = legacyRef?.trim().toLowerCase();

    for (const p of products) {
      if (cleanRef && p.legacy_reference?.trim().toLowerCase() === cleanRef) {
        return { isDuplicate: true, matchedProduct: p, reason: `Ancienne référence identique (${p.legacy_reference})` };
      }
      if (p.name.trim().toLowerCase() === cleanName) {
        return { isDuplicate: true, matchedProduct: p, reason: `Nom strictement identique à l'article ${p.internal_code}` };
      }
    }

    return { isDuplicate: false };
  },

  // Importer un lot de marchandises historiques
  async importLegacyBatch(
    items: Array<{
      name: string;
      category_name: string;
      legacy_reference?: string;
      brand?: string;
      model_reference?: string;
      short_description?: string;
      detail_price?: number;
      wholesale_price?: number;
      reseller_price?: number;
      purchase_price?: number;
      isDuplicate?: boolean;
    }>,
    filename: string,
    userId?: string
  ): Promise<{ importedCount: number; skippedCount: number; duplicateCount: number; errors: string[] }> {
    const categories = await this.getCategories();
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: string[] = [];

    let currentProducts: any[] = [];
    if (isSupabaseConfigured) {
      await ensureFreshSession();
      const { data } = await supabase.from('products').select('id, internal_code, legacy_reference, name');
      currentProducts = data || [];
    } else {
      currentProducts = getLocalProducts();
    }

    let codeCounter = Date.now() % 100000;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || !item.name.trim()) {
        skipped++;
        errors.push(`Ligne ${i + 1}: Nom du produit manquant.`);
        continue;
      }

      // Vérifier si cet article a déjà été importé lors d'un précédent passage
      const cleanItemName = item.name.trim().toLowerCase();
      const cleanItemRef = item.legacy_reference ? item.legacy_reference.trim().toLowerCase() : '';

      const alreadyInserted = currentProducts.some(p => {
        const pRef = p.legacy_reference ? String(p.legacy_reference).trim().toLowerCase() : '';
        const pName = p.name ? String(p.name).trim().toLowerCase() : '';
        return (cleanItemRef && pRef && pRef === cleanItemRef) || (pName === cleanItemName);
      });

      if (alreadyInserted) {
        duplicates++;
        // Déjà importé précédemment, on passe directement sans re-créer
        continue;
      }

      // Correspondance catégorie ou catégorie par défaut
      let matchedCat = categories.find(c => 
        c.name.toLowerCase() === item.category_name?.trim().toLowerCase() ||
        c.name.toLowerCase().includes(item.category_name?.trim().toLowerCase())
      );

      if (!matchedCat) {
        matchedCat = categories.find(c => c.name.includes('divers')) || categories[0];
      }

      let prefix = 'DIV';
      const lowerCat = matchedCat.name.toLowerCase();
      if (lowerCat.includes('imprimerie')) {
        prefix = 'IMP';
      } else if (lowerCat.includes('sérigraphie') || lowerCat.includes('serigraphie')) {
        prefix = 'SER';
      }

      let refPart = item.legacy_reference ? item.legacy_reference.replace(/[^a-zA-Z0-9]/g, '') : '';
      if (!refPart) {
        refPart = String(i + 1).padStart(4, '0');
      }
      let uniqueCode = `GMI-${prefix}-${refPart}`;

      // Si ce code existe déjà, ajouter un suffixe séquentiel pour garantir l'unicité stricte
      if (currentProducts.some(p => p.internal_code === uniqueCode)) {
        uniqueCode = `${uniqueCode}-${i + 1}`;
      }
      currentProducts.push({ internal_code: uniqueCode, legacy_reference: item.legacy_reference, name: item.name });

      const pricesMap: Record<string, number> = {};
      if (item.detail_price) pricesMap['detail'] = item.detail_price;
      if (item.wholesale_price) pricesMap['gros'] = item.wholesale_price;
      if (item.reseller_price) pricesMap['revendeur'] = item.reseller_price;
      if (item.purchase_price) pricesMap['achat'] = item.purchase_price;

      // Rafraîchir la session JWT Supabase périodiquement pour éviter l'expiration
      if (isSupabaseConfigured && i > 0 && i % 25 === 0) {
        try {
          await supabase.auth.refreshSession();
        } catch {
          // continue
        }
      }

      const productPayload = {
        internal_code: uniqueCode,
        name: item.name,
        category_id: matchedCat.id,
        legacy_reference: item.legacy_reference,
        brand: item.brand,
        model_reference: item.model_reference,
        short_description: item.short_description,
        status: 'a_verifier' as ProductStatus,
        prices: pricesMap,
        default_variant_sku: `${uniqueCode}-STD`,
        userId,
      };

      try {
        await this.createProduct(productPayload);
        imported++;
      } catch (err: any) {
        const msg = String(err.message || '');
        // Si le token JWT a expiré, on tente de le rafraîchir et de réinsérer
        if (msg.includes('JWT') || msg.includes('expired') || msg.includes('token') || msg.includes('session')) {
          try {
            await supabase.auth.refreshSession();
            await this.createProduct(productPayload);
            imported++;
            continue;
          } catch (retryErr: any) {
            skipped++;
            errors.push(`Ligne ${i + 1} (${item.name}): ${retryErr.message || 'Session expirée'}`);
            continue;
          }
        }

        skipped++;
        errors.push(`Ligne ${i + 1} (${item.name}): ${msg || 'Erreur lors de la création'}`);
      }
    }

    return { importedCount: imported, skippedCount: skipped, duplicateCount: duplicates, errors };
  }
};
