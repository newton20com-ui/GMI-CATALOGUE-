-- GMI-01 Migration 04: Configuration du Supabase Storage pour les photographies
-- Bucket: product-images

-- Créer ou mettre à jour le bucket 'product-images' (public = true pour affichage CDN direct)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Permet le chargement direct via balises <img> et PWA mobile
    15728640, -- 15 Mo max par photo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politiques RLS pour Storage objects
-- 1. Lecture publique des photographies du catalogue (indispensable pour l'affichage CDN dans les balises <img>)
DROP POLICY IF EXISTS "Product photos viewable by authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Product photos viewable by anyone" ON storage.objects;
CREATE POLICY "Product photos viewable by anyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- 2. Téléversement réservé aux gestionnaires de photos, éditeurs de produits et administrateurs
DROP POLICY IF EXISTS "Product photos uploadable by photo managers" ON storage.objects;
CREATE POLICY "Product photos uploadable by photo managers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images' AND
    (
        public.has_permission('photo:manage') 
        OR public.has_permission('product:edit')
        OR public.has_permission('product:create')
        OR public.is_super_admin()
    )
);

-- 3. Suppression réservée aux gestionnaires de photos, éditeurs de produits et administrateurs
DROP POLICY IF EXISTS "Product photos deletable by photo managers" ON storage.objects;
CREATE POLICY "Product photos deletable by photo managers"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (
        public.has_permission('photo:manage') 
        OR public.has_permission('product:edit')
        OR public.has_permission('product:create')
        OR public.is_super_admin()
    )
);

-- 4. Mise à jour réservée aux gestionnaires de photos, éditeurs de produits et administrateurs
DROP POLICY IF EXISTS "Product photos updatable by photo managers" ON storage.objects;
CREATE POLICY "Product photos updatable by photo managers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (
        public.has_permission('photo:manage') 
        OR public.has_permission('product:edit')
        OR public.has_permission('product:create')
        OR public.is_super_admin()
    )
);

