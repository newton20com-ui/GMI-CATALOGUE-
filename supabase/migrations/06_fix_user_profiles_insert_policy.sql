-- GMI-01 Migration 06: Politique d'insertion pour user_profiles
-- Permet aux gestionnaires d'utilisateurs et au Super Admin d'insérer dans user_profiles
-- Résout l'erreur: "new row violates row-level security policy for table user_profiles"

-- 1. Ajout de la politique d'insertion si elle n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'User profiles insertable by authorized managers'
    ) THEN
        CREATE POLICY "User profiles insertable by authorized managers"
        ON public.user_profiles FOR INSERT
        WITH CHECK (
            public.has_permission('user:manage')
            OR public.is_super_admin()
        );
    END IF;

    -- 2. Ajout de la politique de suppression pour les comptes non protégés
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'User profiles deletable by authorized managers'
    ) THEN
        CREATE POLICY "User profiles deletable by authorized managers"
        ON public.user_profiles FOR DELETE
        USING (
            (public.has_permission('user:manage') OR public.is_super_admin())
            AND is_protected = false
        );
    END IF;
END $$;

