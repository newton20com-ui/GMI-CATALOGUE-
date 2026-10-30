-- GMI-01 Migration 01: Schéma initial complet
-- Catalogue Général Matériel d'Imprimerie et de Sérigraphie (Burkina Faso)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CATÉGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. TYPES DE TARIFS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.price_types (
    code VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    is_confidential BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. PRODUITS (Fiches principales / Familles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_code VARCHAR(50) NOT NULL UNIQUE,
    legacy_reference VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    brand VARCHAR(100),
    model_reference VARCHAR(100),
    alternative_names TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    search_keywords TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    short_description TEXT,
    detailed_presentation TEXT,
    product_usage TEXT,
    technical_specs TEXT,
    precautions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'a_verifier', 'archive')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_internal_code ON public.products(internal_code);
CREATE INDEX IF NOT EXISTS idx_products_legacy_ref ON public.products(legacy_reference);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (to_tsvector('french', name));

-- =============================================================================
-- 4. VARIANTES DE PRODUITS (Modèle mixte)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku VARCHAR(80) NOT NULL UNIQUE,
    variant_name VARCHAR(150) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    specific_features TEXT,
    color VARCHAR(60),
    capacity VARCHAR(60),
    size_format VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants(sku);

-- =============================================================================
-- 5. CONDITIONNEMENTS ET UNITÉS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    package_type VARCHAR(50) NOT NULL, -- 'unite', 'piece', 'paquet', 'carton', 'lot', 'rouleau', 'litre', 'kg'
    package_label VARCHAR(100) NOT NULL, -- ex: 'Carton de 10 paquets'
    units_per_package NUMERIC(12, 2) NOT NULL DEFAULT 1.0 CHECK (units_per_package > 0),
    is_base_unit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_product ON public.product_packages(product_id);
CREATE INDEX IF NOT EXISTS idx_packages_variant ON public.product_packages(variant_id);

-- =============================================================================
-- 6. PRIX DES PRODUITS (Sécurisés)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.product_packages(id) ON DELETE CASCADE,
    price_type_code VARCHAR(50) NOT NULL REFERENCES public.price_types(code) ON DELETE RESTRICT,
    amount_xof NUMERIC(15, 2) NOT NULL CHECK (amount_xof >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_product_variant_package_pricetype UNIQUE (product_id, variant_id, package_id, price_type_code)
);

CREATE INDEX IF NOT EXISTS idx_prices_product ON public.product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_pricetype ON public.product_prices(price_type_code);

-- Historique des modifications de prix
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.product_packages(id) ON DELETE CASCADE,
    price_type_code VARCHAR(50) NOT NULL REFERENCES public.price_types(code),
    old_amount_xof NUMERIC(15, 2),
    new_amount_xof NUMERIC(15, 2) NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);

-- Trigger pour journaliser automatiquement les changements de prix
CREATE OR REPLACE FUNCTION trg_log_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF OLD.amount_xof IS DISTINCT FROM NEW.amount_xof THEN
            INSERT INTO public.price_history (
                product_id, variant_id, package_id, price_type_code,
                old_amount_xof, new_amount_xof, changed_by, changed_at
            ) VALUES (
                NEW.product_id, NEW.variant_id, NEW.package_id, NEW.price_type_code,
                OLD.amount_xof, NEW.amount_xof, NEW.updated_by, now()
            );
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.price_history (
            product_id, variant_id, package_id, price_type_code,
            old_amount_xof, new_amount_xof, changed_by, changed_at
        ) VALUES (
            NEW.product_id, NEW.variant_id, NEW.package_id, NEW.price_type_code,
            NULL, NEW.amount_xof, NEW.updated_by, now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_price_change ON public.product_prices;
CREATE TRIGGER trg_price_change
AFTER INSERT OR UPDATE ON public.product_prices
FOR EACH ROW EXECUTE FUNCTION trg_log_price_history();

-- =============================================================================
-- 7. PHOTOGRAPHIES DES PRODUITS (Stockage Supabase)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(60) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    view_type VARCHAR(50) NOT NULL DEFAULT 'autre',
    caption TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_order ON public.product_images(product_id, order_index);

-- =============================================================================
-- 8. PROFILS UTILISATEURS ET DROITS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_protected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_permission UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_permissions_user ON public.user_permissions(user_id);

-- =============================================================================
-- 9. AUDIT ET IMPORTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.legacy_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    imported_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
