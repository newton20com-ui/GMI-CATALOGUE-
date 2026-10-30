-- GMI-01 Migration 03: Données initiales (Seed Data)
-- Initialisation exacte des 7 catégories et des grilles tarifaires de base

-- =============================================================================
-- 1. INSERTION DES 7 CATÉGORIES EXACTES (Ordre strict)
-- =============================================================================
INSERT INTO public.categories (name, slug, description, display_order, is_active)
VALUES
    ('Imprimerie — Consommables', 'imprimerie-consommables', 'Encres, plaques offset, blanchets, produits chimiques et consommables divers pour l''imprimerie.', 1, true),
    ('Imprimerie — Machines', 'imprimerie-machines', 'Presses offset, duplicateurs, massicots, plieuses et équipements d''imprimerie.', 2, true),
    ('Imprimerie — Pièces', 'imprimerie-pieces', 'Pièces de rechange, rouleaux, courroies, moteurs et composants mécaniques d''imprimerie.', 3, true),
    ('Sérigraphie — Consommables', 'serigraphie-consommables', 'Encres plastisols, encres à l''eau, émulsions, dégraveurs, cadres et toiles.', 4, true),
    ('Sérigraphie — Machines', 'serigraphie-machines', 'Carrousels manuels et automatiques, tunnels de séchage, flasheuses et insoleuses.', 5, true),
    ('Sérigraphie — Pièces', 'serigraphie-pieces', 'Racles, contre-racles, pinces, potentiomètres et pièces pour machines de sérigraphie.', 6, true),
    ('Articles divers', 'articles-divers', 'Matériel de finition, adhésifs, outillage, emballages et accessoires divers.', 7, true)
ON CONFLICT (name) DO UPDATE
SET display_order = EXCLUDED.display_order,
    description = EXCLUDED.description;

-- =============================================================================
-- 2. INSERTION DES TYPES DE TARIFS STANDARDS
-- =============================================================================
INSERT INTO public.price_types (code, label, description, is_confidential, display_order)
VALUES
    ('detail', 'Prix de détail', 'Tarif public standard visible par tous les employés autorisés.', false, 1),
    ('gros', 'Prix de gros', 'Tarif grossiste accordé sur volume et décision commerciale.', true, 2),
    ('revendeur', 'Prix revendeur', 'Tarif partenaire ou revendeur agréé.', true, 3),
    ('achat', 'Prix d''achat', 'Coût d''acquisition confidentiel de la marchandise.', true, 4)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_confidential = EXCLUDED.is_confidential,
    display_order = EXCLUDED.display_order;
