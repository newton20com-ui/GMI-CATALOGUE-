-- GMI-01 Migration 02: Row Level Security (RLS) et Politiques d'Accès Sécurisées
-- Isolation stricte des tarifs confidentiels et des données au niveau BDD

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_import_batches ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- FONCTIONS D'AIDE DE SÉCURITÉ (SECURITY DEFINER)
-- =============================================================================

-- Vérifier si l'utilisateur est authentifié et actif
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT is_active INTO v_is_active
    FROM public.user_profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_is_active, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est un super administrateur
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role INTO v_role
    FROM public.user_profiles
    WHERE id = auth.uid() AND is_active = true;

    RETURN (v_role = 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur possède une permission spécifique
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_perm BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Le super_admin a automatiquement toutes les permissions
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Vérifier dans la table des permissions
    SELECT EXISTS (
        SELECT 1
        FROM public.user_permissions p
        JOIN public.user_profiles u ON u.id = p.user_id
        WHERE p.user_id = auth.uid()
          AND u.is_active = true
          AND p.permission_key = p_permission_key
    ) INTO v_has_perm;

    RETURN COALESCE(v_has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- POLITIQUES RLS: CATÉGORIES
-- =============================================================================
-- Tous les utilisateurs actifs peuvent consulter les catégories
CREATE POLICY "Categories are readable by active authenticated users"
ON public.categories FOR SELECT
USING (public.is_active_user());

-- Seuls les utilisateurs avec 'category:manage' ou super_admin peuvent modifier
CREATE POLICY "Categories can be inserted by category managers"
ON public.categories FOR INSERT
WITH CHECK (public.has_permission('category:manage'));

CREATE POLICY "Categories can be updated by category managers"
ON public.categories FOR UPDATE
USING (public.has_permission('category:manage'))
WITH CHECK (public.has_permission('category:manage'));

-- =============================================================================
-- POLITIQUES RLS: TYPES DE PRIX
-- =============================================================================
CREATE POLICY "Price types readable by active users"
ON public.price_types FOR SELECT
USING (public.is_active_user());

-- =============================================================================
-- POLITIQUES RLS: PRODUITS
-- =============================================================================
CREATE POLICY "Products readable by authorized users"
ON public.products FOR SELECT
USING (public.has_permission('catalog:view') OR public.is_super_admin());

CREATE POLICY "Products can be inserted by authorized creators"
ON public.products FOR INSERT
WITH CHECK (public.has_permission('product:create'));

CREATE POLICY "Products can be updated by authorized editors"
ON public.products FOR UPDATE
USING (public.has_permission('product:edit'))
WITH CHECK (public.has_permission('product:edit'));

CREATE POLICY "Products can be archived or deleted by authorized managers"
ON public.products FOR DELETE
USING (public.has_permission('product:archive'));

-- =============================================================================
-- POLITIQUES RLS: VARIANTES ET CONDITIONNEMENTS
-- =============================================================================
CREATE POLICY "Variants readable by catalog viewers"
ON public.product_variants FOR SELECT
USING (public.has_permission('catalog:view') OR public.is_super_admin());

CREATE POLICY "Variants modifiable by product editors"
ON public.product_variants FOR ALL
USING (public.has_permission('product:edit') OR public.has_permission('product:create'))
WITH CHECK (public.has_permission('product:edit') OR public.has_permission('product:create'));

CREATE POLICY "Packages readable by catalog viewers"
ON public.product_packages FOR SELECT
USING (public.has_permission('catalog:view') OR public.is_super_admin());

CREATE POLICY "Packages modifiable by product editors"
ON public.product_packages FOR ALL
USING (public.has_permission('product:edit') OR public.has_permission('product:create'))
WITH CHECK (public.has_permission('product:edit') OR public.has_permission('product:create'));

-- =============================================================================
-- POLITIQUES RLS: TARIFS (SÉCURITÉ CRITIQUE AU NIVEAU DE LA BASE DE DONNÉES)
-- =============================================================================
-- Les tarifs ne sont retournés que si l'utilisateur a le droit spécifique pour CE type de tarif !
CREATE POLICY "Prices SELECT strictly controlled by price type"
ON public.product_prices FOR SELECT
USING (
    public.is_active_user() AND (
        -- Le prix de détail est visible par tout utilisateur ayant catalog:view
        (price_type_code = 'detail' AND (public.has_permission('catalog:view') OR public.is_super_admin()))
        -- Les autres prix exigent la permission dédiée correspondante (ex: price:view:achat, price:view:gros)
        OR public.has_permission('price:view:' || price_type_code)
        OR public.is_super_admin()
    )
);

CREATE POLICY "Prices INSERT strictly controlled by price edit permission"
ON public.product_prices FOR INSERT
WITH CHECK (
    public.is_active_user() AND (
        public.has_permission('price:edit:' || price_type_code)
        OR public.is_super_admin()
    )
);

CREATE POLICY "Prices UPDATE strictly controlled by price edit permission"
ON public.product_prices FOR UPDATE
USING (
    public.is_active_user() AND (
        public.has_permission('price:edit:' || price_type_code)
        OR public.is_super_admin()
    )
)
WITH CHECK (
    public.is_active_user() AND (
        public.has_permission('price:edit:' || price_type_code)
        OR public.is_super_admin()
    )
);

CREATE POLICY "Prices DELETE strictly controlled by price edit permission"
ON public.product_prices FOR DELETE
USING (
    public.is_active_user() AND (
        public.has_permission('price:edit:' || price_type_code)
        OR public.is_super_admin()
    )
);

-- Historique des prix: consultation selon permission
CREATE POLICY "Price history readable by authorized price viewers"
ON public.price_history FOR SELECT
USING (
    public.is_active_user() AND (
        (price_type_code = 'detail' AND (public.has_permission('catalog:view') OR public.is_super_admin()))
        OR public.has_permission('price:view:' || price_type_code)
        OR public.is_super_admin()
    )
);

-- =============================================================================
-- POLITIQUES RLS: PHOTOGRAPHIES
-- =============================================================================
CREATE POLICY "Images readable by catalog viewers"
ON public.product_images FOR SELECT
USING (public.has_permission('catalog:view') OR public.is_super_admin());

CREATE POLICY "Images modifiable by photo managers"
ON public.product_images FOR ALL
USING (
    public.has_permission('photo:manage') 
    OR public.has_permission('product:edit')
    OR public.has_permission('product:create')
    OR public.is_super_admin()
)
WITH CHECK (
    public.has_permission('photo:manage') 
    OR public.has_permission('product:edit')
    OR public.has_permission('product:create')
    OR public.is_super_admin()
);

-- =============================================================================
-- POLITIQUES RLS: PROFILS UTILISATEURS
-- =============================================================================
-- Chaque utilisateur peut lire son propre profil, et les gestionnaires peuvent lire tous les profils
CREATE POLICY "Users can view own profile or user managers can view all"
ON public.user_profiles FOR SELECT
USING (
    auth.uid() = id
    OR public.has_permission('user:manage')
    OR public.is_super_admin()
);

-- Mise à jour des profils: Seuls les gestionnaires autorisés ou le super_admin
-- Protection stricte: personne ne peut désactiver ou dégrader le compte protégé
CREATE POLICY "User profiles modifiable by authorized managers"
ON public.user_profiles FOR UPDATE
USING (
    (public.has_permission('user:manage') OR public.is_super_admin())
    -- Si la cible est protégée, seul le super_admin lui-même peut modifier son nom mais PAS le désactiver ni changer son rôle
    AND (
        is_protected = false 
        OR (auth.uid() = id AND public.is_super_admin())
    )
)
WITH CHECK (
    (public.has_permission('user:manage') OR public.is_super_admin())
    AND (
        is_protected = false
        OR (is_active = true AND role = 'super_admin') -- Empêche la désactivation du compte protégé
    )
);

-- Insertion de profils: Autorisé pour les gestionnaires ou le super_admin
CREATE POLICY "User profiles insertable by authorized managers"
ON public.user_profiles FOR INSERT
WITH CHECK (
    public.has_permission('user:manage')
    OR public.is_super_admin()
);


-- =============================================================================
-- POLITIQUES RLS: PERMISSIONS
-- =============================================================================
CREATE POLICY "Permissions readable by user managers or self"
ON public.user_permissions FOR SELECT
USING (
    user_id = auth.uid()
    OR public.has_permission('permission:manage')
    OR public.is_super_admin()
);

CREATE POLICY "Permissions modifiable by permission managers"
ON public.user_permissions FOR ALL
USING (
    (public.has_permission('permission:manage') OR public.is_super_admin())
    -- Interdiction de modifier les permissions du compte super_admin protégé par un autre utilisateur
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles p 
        WHERE p.id = public.user_permissions.user_id AND p.is_protected = true AND p.id <> auth.uid()
    )
)
WITH CHECK (
    (public.has_permission('permission:manage') OR public.is_super_admin())
);

-- =============================================================================
-- POLITIQUES RLS: AUDIT & IMPORTS
-- =============================================================================
CREATE POLICY "Audit events readable by admins"
ON public.audit_events FOR SELECT
USING (public.has_permission('user:manage') OR public.is_super_admin());

CREATE POLICY "Audit events insertable by active users"
ON public.audit_events FOR INSERT
WITH CHECK (public.is_active_user());

CREATE POLICY "Legacy import batches readable by import managers"
ON public.legacy_import_batches FOR SELECT
USING (public.has_permission('import:execute') OR public.is_super_admin());

CREATE POLICY "Legacy import batches insertable by import managers"
ON public.legacy_import_batches FOR INSERT
WITH CHECK (public.has_permission('import:execute') OR public.is_super_admin());
