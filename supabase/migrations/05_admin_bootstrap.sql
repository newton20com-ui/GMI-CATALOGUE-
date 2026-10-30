-- GMI-01 Migration 05: Initialisation sécurisée du Premier Administrateur Principal
-- Procédure de bootstrap sans mot de passe en dur

-- Trigger automatique de création d'un profil minimal lors de la création d'un compte auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_user_count INT;
BEGIN
    SELECT count(*) INTO v_user_count FROM public.user_profiles;

    -- Si c'est le tout premier utilisateur inscrit de la base de données, il devient super_admin protégé
    IF v_user_count = 0 THEN
        INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_protected)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'super_admin',
            true,
            true
        );

        -- Attribution de l'ensemble des permissions fondamentales au premier super_admin
        INSERT INTO public.user_permissions (user_id, permission_key)
        VALUES
            (NEW.id, 'catalog:view'),
            (NEW.id, 'product:create'),
            (NEW.id, 'product:edit'),
            (NEW.id, 'product:archive'),
            (NEW.id, 'photo:manage'),
            (NEW.id, 'category:manage'),
            (NEW.id, 'price:view:achat'),
            (NEW.id, 'price:view:gros'),
            (NEW.id, 'price:view:revendeur'),
            (NEW.id, 'price:edit:achat'),
            (NEW.id, 'price:edit:detail'),
            (NEW.id, 'price:edit:gros'),
            (NEW.id, 'price:edit:revendeur'),
            (NEW.id, 'user:manage'),
            (NEW.id, 'permission:manage'),
            (NEW.id, 'import:execute')
        ON CONFLICT DO NOTHING;

    ELSE
        -- Pour les utilisateurs suivants: profil staff standard, inactif jusqu'à validation par un administrateur
        INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_protected)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'staff',
            false, -- Requiert l'activation par un administrateur
            false
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Procédure manuelle de promotion d'urgence si nécessaire par le DBA
-- =============================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_user_id UUID;
    v_existing_super_admin INT;
BEGIN
    -- Vérifier s'il existe déjà un super_admin actif
    SELECT count(*) INTO v_existing_super_admin 
    FROM public.user_profiles 
    WHERE role = 'super_admin' AND is_protected = true;

    IF v_existing_super_admin > 0 THEN
        RAISE EXCEPTION 'Un administrateur principal existe déjà. Opération refusée pour raison de sécurité.';
    END IF;

    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Aucun utilisateur trouvé avec l''adresse % dans auth.users', target_email;
    END IF;

    -- Mise à jour du profil
    UPDATE public.user_profiles
    SET role = 'super_admin', is_active = true, is_protected = true
    WHERE id = v_user_id;

    -- Accorder toutes les permissions
    INSERT INTO public.user_permissions (user_id, permission_key)
    VALUES
        (v_user_id, 'catalog:view'),
        (v_user_id, 'product:create'),
        (v_user_id, 'product:edit'),
        (v_user_id, 'product:archive'),
        (v_user_id, 'photo:manage'),
        (v_user_id, 'category:manage'),
        (v_user_id, 'price:view:achat'),
        (v_user_id, 'price:view:gros'),
        (v_user_id, 'price:view:revendeur'),
        (v_user_id, 'price:edit:achat'),
        (v_user_id, 'price:edit:detail'),
        (v_user_id, 'price:edit:gros'),
        (v_user_id, 'price:edit:revendeur'),
        (v_user_id, 'user:manage'),
        (v_user_id, 'permission:manage'),
        (v_user_id, 'import:execute')
    ON CONFLICT DO NOTHING;

    RETURN 'Succès: ' || target_email || ' est désormais l''administrateur principal protégé.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
