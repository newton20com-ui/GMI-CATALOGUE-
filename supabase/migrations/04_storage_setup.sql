-- GMI-01 Migration 04: Configuration du Supabase Storage pour les photographies
-- Bucket: product-images

-- Créer le bucket 'product-images' si non existant (public = false pour sécurité)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Visibilité des URLs publiques pour affichage rapide par les utilisateurs authentifiés de l'application
    15728640, -- 15 Mo max par photo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politiques RLS pour Storage objects
CREATE POLICY "Product photos viewable by authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Product photos uploadable by photo managers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images' AND
    (public.has_permission('photo:manage') OR public.is_super_admin())
);

CREATE POLICY "Product photos deletable by photo managers"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (public.has_permission('photo:manage') OR public.is_super_admin())
);

CREATE POLICY "Product photos updatable by photo managers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (public.has_permission('photo:manage') OR public.is_super_admin())
);
