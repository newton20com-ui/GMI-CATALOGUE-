import { Category, Product, UserProfile, UserRole } from '../types';
import { INITIAL_CATEGORIES } from './constants';

export const MOCK_CATEGORIES: Category[] = INITIAL_CATEGORIES.map((cat, idx) => ({
  id: `cat-${idx + 1}`,
  ...cat,
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: new Date('2026-01-01').toISOString(),
}));

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'user-super-admin',
    email: 'admin.principal@gmi.bf',
    full_name: 'Direction Générale (Super Admin)',
    role: 'super_admin' as UserRole,
    is_active: true,
    is_protected: true, // Compte protégé contre la désactivation
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    permissions: [
      'catalog:view',
      'product:create',
      'product:edit',
      'product:archive',
      'photo:manage',
      'category:manage',
      'price:view:achat',
      'price:view:gros',
      'price:view:revendeur',
      'price:edit:detail',
      'price:edit:achat',
      'price:edit:gros',
      'price:edit:revendeur',
      'user:manage',
      'permission:manage',
      'import:execute',
    ],
  },
  {
    id: 'user-manager',
    email: 'commercial@gmi.bf',
    full_name: 'Responsable Commercial',
    role: 'admin' as UserRole,
    is_active: true,
    is_protected: false,
    created_at: '2026-01-15T09:30:00Z',
    updated_at: '2026-01-15T09:30:00Z',
    permissions: [
      'catalog:view',
      'product:create',
      'product:edit',
      'photo:manage',
      'price:view:gros',
      'price:view:revendeur',
      'price:edit:detail',
      'price:edit:gros',
      'import:execute',
    ],
  },
  {
    id: 'user-staff',
    email: 'magasinier@gmi.bf',
    full_name: 'Agent Magasinier',
    role: 'staff' as UserRole,
    is_active: true,
    is_protected: false,
    created_at: '2026-02-01T10:15:00Z',
    updated_at: '2026-02-01T10:15:00Z',
    permissions: [
      'catalog:view',
    ],
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    internal_code: 'GMI-IMP-001',
    legacy_reference: 'ENC-OFF-01',
    name: 'Encre Offset Process Cyan Quadri High-Gloss',
    category_id: 'cat-1', // Imprimerie — Consommables
    brand: 'Flint Group',
    model_reference: 'K+E Novavit 918 Supreme',
    alternative_names: ['Encre Cyan quadri', 'Bleu offset imprimerie'],
    search_keywords: ['cyan', 'flint', 'quadri', 'encre', 'offset', 'novavit'],
    short_description: "Encre végétale pour impression offset quadrichromie rapide et séchage par oxydation.",
    detailed_presentation: "La série Novavit 918 est formulée à base de matières premières d'origine végétale renouvelable. Elle offre un brillant exceptionnel, un équilibre eau-encre très stable et un séchage rapide sur machines feuilles à grande cadence.",
    product_usage: "Adaptée à tous les travaux d'édition, packaging carton plat et dépliants commerciaux sur papiers couchés et non couchés.",
    technical_specs: "Viscosité standard internationale. Taux de séchage rapide. Résistance au frottement élevée. Conforme aux normes ISO 2846-1 et ISO 12647-2.",
    precautions: "Conserver les boîtes hermétiquement fermées à température ambiante (18-25°C), à l'abri de l'humidité directe.",
    status: 'actif',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-001',
      product_id: 'prod-001',
      storage_path: 'products/prod-001/cyan_main.jpg',
      public_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
      original_filename: 'cyan_novavit_1kg.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 420000,
      view_type: 'principale',
      caption: 'Boîte de 1 kg ou 2,5 kg sous vide',
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-001',
        product_id: 'prod-001',
        storage_path: 'products/prod-001/cyan_main.jpg',
        public_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
        original_filename: 'cyan_novavit_1kg.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 420000,
        view_type: 'principale',
        caption: 'Boîte sous vide scellée',
        is_primary: true,
        order_index: 0,
      },
      {
        id: 'img-002',
        product_id: 'prod-001',
        storage_path: 'products/prod-001/cyan_box.jpg',
        public_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80',
        original_filename: 'carton_12kg.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 310000,
        view_type: 'carton_exterieur',
        caption: "Carton d'origine de 12 boîtes",
        is_primary: false,
        order_index: 1,
      }
    ],
    variants: [
      {
        id: 'var-001-1',
        product_id: 'prod-001',
        sku: 'GMI-IMP-001-1KG',
        variant_name: 'Conditionnement 1 kg',
        is_default: true,
        capacity: '1 kg',
        color: 'Cyan (#009EE3)',
      },
      {
        id: 'var-001-2',
        product_id: 'prod-001',
        sku: 'GMI-IMP-001-2.5KG',
        variant_name: 'Conditionnement 2.5 kg',
        is_default: false,
        capacity: '2.5 kg',
        color: 'Cyan (#009EE3)',
      }
    ],
    packages: [
      {
        id: 'pkg-001-1',
        product_id: 'prod-001',
        package_type: 'boite',
        package_label: 'Boîte unitaire 1 kg',
        units_per_package: 1,
        is_base_unit: true,
      },
      {
        id: 'pkg-001-2',
        product_id: 'prod-001',
        package_type: 'carton',
        package_label: 'Carton de 12 boîtes (12 kg)',
        units_per_package: 12,
        is_base_unit: false,
      }
    ],
    prices: [
      {
        id: 'prc-001-1',
        product_id: 'prod-001',
        price_type_code: 'detail',
        amount_xof: 12500, // 12 500 FCFA
      },
      {
        id: 'prc-001-2',
        product_id: 'prod-001',
        price_type_code: 'gros',
        amount_xof: 10500, // 10 500 FCFA
      },
      {
        id: 'prc-001-3',
        product_id: 'prod-001',
        price_type_code: 'revendeur',
        amount_xof: 9800, // 9 800 FCFA
      },
      {
        id: 'prc-001-4',
        product_id: 'prod-001',
        price_type_code: 'achat',
        amount_xof: 7200, // 7 200 FCFA
      }
    ]
  },
  {
    id: 'prod-002',
    internal_code: 'GMI-SER-001',
    legacy_reference: 'PLAST-BLC-05',
    name: 'Encre Plastisol Sérigraphie Blanc Opaque Flash',
    category_id: 'cat-4', // Sérigraphie — Consommables
    brand: 'Amex Screen',
    model_reference: 'White Extra Flash',
    alternative_names: ['Plastisol blanc', 'Blanc coton sérigraphie'],
    search_keywords: ['plastisol', 'blanc', 'amex', 'sérigraphie', 'flash', 'textile'],
    short_description: 'Encre plastisol crémeuse à très haut pouvoir couvrant pour textiles foncés.',
    detailed_presentation: "Encre prête à l'emploi à base de résine PVC plastifiée. Excellente opacité sur tee-shirts noirs ou coton foncé. Temps de flashage ultra rapide sous flasheuse intermédiaire sans collant résiduel.",
    product_usage: 'Application textile coton, polycoton, jersey. Maille recommandée : 43 à 77 fils/cm.',
    technical_specs: "Polymérisation au four ou tunnel à 160°C pendant 2 à 3 minutes. Nettoyage au solvant spécifique pour plastisol.",
    precautions: 'Ne sèche pas à l\'air libre. Nécessite obligatoirement une cuisson thermique à 160°C.',
    status: 'actif',
    created_at: '2026-03-05T14:20:00Z',
    updated_at: '2026-03-05T14:20:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-003',
      product_id: 'prod-002',
      storage_path: 'products/prod-002/amex_white.jpg',
      public_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
      original_filename: 'amex_blanc_5kg.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 380000,
      view_type: 'principale',
      caption: 'Seau de 5 kg avec couvercle hermétique',
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-003',
        product_id: 'prod-002',
        storage_path: 'products/prod-002/amex_white.jpg',
        public_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
        original_filename: 'amex_blanc_5kg.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 380000,
        view_type: 'principale',
        caption: 'Seau hermétique de 5 kg',
        is_primary: true,
        order_index: 0,
      }
    ],
    variants: [
      {
        id: 'var-002-1',
        product_id: 'prod-002',
        sku: 'GMI-SER-001-1KG',
        variant_name: 'Pot de 1 kg',
        is_default: false,
        capacity: '1 kg',
        color: 'Blanc pur',
      },
      {
        id: 'var-002-2',
        product_id: 'prod-002',
        sku: 'GMI-SER-001-5KG',
        variant_name: 'Seau de 5 kg',
        is_default: true,
        capacity: '5 kg',
        color: 'Blanc pur',
      }
    ],
    packages: [
      {
        id: 'pkg-002-1',
        product_id: 'prod-002',
        package_type: 'pot',
        package_label: 'Pot de 1 kg',
        units_per_package: 1,
        is_base_unit: false,
      },
      {
        id: 'pkg-002-2',
        product_id: 'prod-002',
        package_type: 'seau',
        package_label: 'Seau de 5 kg',
        units_per_package: 5,
        is_base_unit: true,
      }
    ],
    prices: [
      {
        id: 'prc-002-1',
        product_id: 'prod-002',
        price_type_code: 'detail',
        amount_xof: 38500, // 38 500 FCFA pour le seau
      },
      {
        id: 'prc-002-2',
        product_id: 'prod-002',
        price_type_code: 'gros',
        amount_xof: 33000,
      },
      {
        id: 'prc-002-3',
        product_id: 'prod-002',
        price_type_code: 'revendeur',
        amount_xof: 31000,
      },
      {
        id: 'prc-002-4',
        product_id: 'prod-002',
        price_type_code: 'achat',
        amount_xof: 24000,
      }
    ]
  },
  {
    id: 'prod-003',
    internal_code: 'GMI-SER-002',
    legacy_reference: 'CARROU-4C-1P',
    name: 'Carrousel Sérigraphie Manuel 4 Couleurs 1 Plateau',
    category_id: 'cat-5', // Sérigraphie — Machines
    brand: 'Vastex',
    model_reference: 'V-100 Tabletop',
    alternative_names: ['Presse sérigraphie manuelle', 'Carrousel 4 couleurs'],
    search_keywords: ['carrousel', 'vastex', 'sérigraphie', 'machine', 'presse', '4 couleurs'],
    short_description: 'Machine manuelle compacte de précision pour impression textile 4 couleurs.',
    detailed_presentation: "Châssis robuste en acier laqué avec système de repérage micrométrique sur roulements à billes. Bras équilibrés par ressorts d'ajustement. Idéal pour ateliers d'impression textile et débutants exigeants.",
    product_usage: 'Impression textile multi-couleurs sur t-shirts, polos, sacs en toile.',
    technical_specs: "4 têtes pivotantes, 1 jeannette en bois stratifié 40x50 cm interchangeable. Rotation souple 360°. Poids net : 32 kg.",
    precautions: 'Fixer solidement sur un établi plat avant utilisation intensive.',
    status: 'actif',
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-10T11:00:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-004',
      product_id: 'prod-003',
      storage_path: 'products/prod-003/carrousel.jpg',
      public_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80',
      original_filename: 'carrousel_vastex_4c.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 650000,
      view_type: 'principale',
      caption: "Vue d'ensemble de la machine assemblée",
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-004',
        product_id: 'prod-003',
        storage_path: 'products/prod-003/carrousel.jpg',
        public_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80',
        original_filename: 'carrousel_vastex_4c.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 650000,
        view_type: 'principale',
        caption: 'Vue générale',
        is_primary: true,
        order_index: 0,
      }
    ],
    variants: [
      {
        id: 'var-003-1',
        product_id: 'prod-003',
        sku: 'GMI-SER-002-STD',
        variant_name: 'Modèle standard 4C-1P',
        is_default: true,
      }
    ],
    packages: [
      {
        id: 'pkg-003-1',
        product_id: 'prod-003',
        package_type: 'carton',
        package_label: 'Caisse bois / Carton renforcé',
        units_per_package: 1,
        is_base_unit: true,
      }
    ],
    prices: [
      {
        id: 'prc-003-1',
        product_id: 'prod-003',
        price_type_code: 'detail',
        amount_xof: 395000, // 395 000 FCFA
      },
      {
        id: 'prc-003-2',
        product_id: 'prod-003',
        price_type_code: 'gros',
        amount_xof: 350000,
      },
      {
        id: 'prc-003-3',
        product_id: 'prod-003',
        price_type_code: 'revendeur',
        amount_xof: 330000,
      },
      {
        id: 'prc-003-4',
        product_id: 'prod-003',
        price_type_code: 'achat',
        amount_xof: 260000,
      }
    ]
  },
  {
    id: 'prod-004',
    internal_code: 'GMI-IMP-002',
    legacy_reference: 'ROUL-GTO-52',
    name: 'Rouleau Toucheur Encreur Caoutchouc Heidelberg GTO 52',
    category_id: 'cat-3', // Imprimerie — Pièces
    brand: 'Böttcher',
    model_reference: 'GTO 52 Inker Roller #2',
    alternative_names: ['Rouleau encreur GTO 52', 'Gomme toucheur Heidelberg'],
    search_keywords: ['rouleau', 'heidelberg', 'gto52', 'bottcher', 'toucheur', 'imprimerie', 'pièce'],
    short_description: 'Rouleau encreur de précision en élastomère de haute qualité pour presse Heidelberg GTO 52.',
    detailed_presentation: "Gomme Böttcher d'origine garantissant un transfert d'encre d'une extrême régularité, une excellente résistance à l'abrasion et aux solvants de lavage standards.",
    product_usage: "Remplacement de rouleau usagé sur groupe d'encrage machine Heidelberg GTO 52.",
    technical_specs: "Dureté : 30° Shore A. Diamètre précis selon cotes d'origine constructeur Heidelberg. Axe en acier traité inclus.",
    precautions: "Protéger de la lumière directe et du soleil pour éviter l'oxydation prématurée du caoutchouc.",
    status: 'actif',
    created_at: '2026-03-12T09:15:00Z',
    updated_at: '2026-03-12T09:15:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-005',
      product_id: 'prod-004',
      storage_path: 'products/prod-004/roller.jpg',
      public_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      original_filename: 'rouleau_gto52.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 290000,
      view_type: 'principale',
      caption: 'Rouleau neuf sous film protecteur',
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-005',
        product_id: 'prod-004',
        storage_path: 'products/prod-004/roller.jpg',
        public_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        original_filename: 'rouleau_gto52.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 290000,
        view_type: 'principale',
        caption: "Emballage d'origine",
        is_primary: true,
        order_index: 0,
      }
    ],
    variants: [
      {
        id: 'var-004-1',
        product_id: 'prod-004',
        sku: 'GMI-IMP-002-STD',
        variant_name: 'Pièce standard GTO 52',
        is_default: true,
      }
    ],
    packages: [
      {
        id: 'pkg-004-1',
        product_id: 'prod-004',
        package_type: 'piece',
        package_label: 'Pièce unitaire protégée',
        units_per_package: 1,
        is_base_unit: true,
      }
    ],
    prices: [
      {
        id: 'prc-004-1',
        product_id: 'prod-004',
        price_type_code: 'detail',
        amount_xof: 52000, // 52 000 FCFA
      },
      {
        id: 'prc-004-2',
        product_id: 'prod-004',
        price_type_code: 'gros',
        amount_xof: 46000,
      },
      {
        id: 'prc-004-3',
        product_id: 'prod-004',
        price_type_code: 'revendeur',
        amount_xof: 42500,
      },
      {
        id: 'prc-004-4',
        product_id: 'prod-004',
        price_type_code: 'achat',
        amount_xof: 32000,
      }
    ]
  },
  {
    id: 'prod-005',
    internal_code: 'GMI-SER-003',
    legacy_reference: 'RACLE-ALU-75',
    name: 'Racle Sérigraphie Poignée Aluminium Lame 75 Sh',
    category_id: 'cat-6', // Sérigraphie — Pièces
    brand: 'Fimor Serilor',
    model_reference: 'Serilor HR3',
    alternative_names: ['Racle alu', 'Raclette sérigraphie', 'Lame polyuréthane'],
    search_keywords: ['racle', 'fimor', 'serilor', 'aluminium', 'sérigraphie', 'polyuréthane'],
    short_description: 'Racle manuelle profilé aluminium anodisé avec lame polyuréthane interchangeable 75 Shore A.',
    detailed_presentation: "Profil en aluminium ergonomique, léger et facile à nettoyer. Maintien parfait de la lame sans perçage. Lame triple couche résistante aux encres à base d'eau et plastisols.",
    product_usage: 'Raclée manuelle sur cadres de sérigraphie textile ou graphiques.',
    technical_specs: 'Dureté : 75 Shore A (verte). Longueurs disponibles : 20 cm, 30 cm, 40 cm.',
    precautions: "Nettoyer immédiatement après utilisation pour préserver la netteté du biseau de la lame.",
    status: 'actif',
    created_at: '2026-03-15T15:45:00Z',
    updated_at: '2026-03-15T15:45:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-006',
      product_id: 'prod-005',
      storage_path: 'products/prod-005/racle_alu.jpg',
      public_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
      original_filename: 'racle_serilor_alu.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 250000,
      view_type: 'principale',
      caption: 'Profilé aluminium et lame verte 75 Sh',
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-006',
        product_id: 'prod-005',
        storage_path: 'products/prod-005/racle_alu.jpg',
        public_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
        original_filename: 'racle_serilor_alu.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 250000,
        view_type: 'principale',
        caption: 'Profilé et lame verte',
        is_primary: true,
        order_index: 0,
      }
    ],
    variants: [
      {
        id: 'var-005-1',
        product_id: 'prod-005',
        sku: 'GMI-SER-003-20CM',
        variant_name: 'Longueur 20 cm',
        is_default: false,
        size_format: '20 cm',
      },
      {
        id: 'var-005-2',
        product_id: 'prod-005',
        sku: 'GMI-SER-003-30CM',
        variant_name: 'Longueur 30 cm',
        is_default: true,
        size_format: '30 cm',
      },
      {
        id: 'var-005-3',
        product_id: 'prod-005',
        sku: 'GMI-SER-003-40CM',
        variant_name: 'Longueur 40 cm',
        is_default: false,
        size_format: '40 cm',
      }
    ],
    packages: [
      {
        id: 'pkg-005-1',
        product_id: 'prod-005',
        package_type: 'unite',
        package_label: 'Racle unitaire montée',
        units_per_package: 1,
        is_base_unit: true,
      }
    ],
    prices: [
      {
        id: 'prc-005-1',
        product_id: 'prod-005',
        price_type_code: 'detail',
        amount_xof: 18500, // 18 500 FCFA
      },
      {
        id: 'prc-005-2',
        product_id: 'prod-005',
        price_type_code: 'gros',
        amount_xof: 15500,
      },
      {
        id: 'prc-005-3',
        product_id: 'prod-005',
        price_type_code: 'revendeur',
        amount_xof: 14000,
      },
      {
        id: 'prc-005-4',
        product_id: 'prod-005',
        price_type_code: 'achat',
        amount_xof: 10200,
      }
    ]
  },
  {
    id: 'prod-006',
    internal_code: 'GMI-DIV-001',
    legacy_reference: 'SCOTCH-MAR-50',
    name: 'Ruban Adhésif Kraft Brun Emballage 50mm x 50m',
    category_id: 'cat-7', // Articles divers
    brand: 'Tesa',
    model_reference: 'Tesa 4713 EcoLogo',
    alternative_names: ['Scotch marron', 'Adhésif carton kraft'],
    search_keywords: ['adhésif', 'kraft', 'tesa', 'carton', 'emballage', 'ruban'],
    short_description: "Ruban adhésif écologique en papier kraft pour fermeture de cartons d'expédition.",
    detailed_presentation: "Support en papier non siliconé issu de forêts gérées durablement, enduit d'un adhésif en caoutchouc naturel. Se déchire facilement à la main et adhère immédiatement sur tous types de cartons.",
    product_usage: "Conditionnement des colis et expédition des travaux d'impression.",
    technical_specs: 'Largeur : 50 mm. Longueur : 50 m. Épaisseur totale : 107 µm.',
    precautions: 'Conserver au sec à l\'abri de fortes chaleurs.',
    status: 'actif',
    created_at: '2026-03-18T16:00:00Z',
    updated_at: '2026-03-18T16:00:00Z',
    created_by: 'user-super-admin',
    primary_image: {
      id: 'img-007',
      product_id: 'prod-006',
      storage_path: 'products/prod-006/scotch_kraft.jpg',
      public_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
      original_filename: 'ruban_kraft_tesa.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 210000,
      view_type: 'principale',
      caption: 'Rouleau de 50 m',
      is_primary: true,
      order_index: 0,
    },
    images: [
      {
        id: 'img-007',
        product_id: 'prod-006',
        storage_path: 'products/prod-006/scotch_kraft.jpg',
        public_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
        original_filename: 'ruban_kraft_tesa.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 210000,
        view_type: 'principale',
        caption: 'Rouleau kraft 50 mm',
        is_primary: true,
        order_index: 0,
      }
    ],
    variants: [
      {
        id: 'var-006-1',
        product_id: 'prod-006',
        sku: 'GMI-DIV-001-STD',
        variant_name: 'Rouleau 50mm x 50m',
        is_default: true,
      }
    ],
    packages: [
      {
        id: 'pkg-006-1',
        product_id: 'prod-006',
        package_type: 'rouleau',
        package_label: 'Rouleau unitaire',
        units_per_package: 1,
        is_base_unit: true,
      },
      {
        id: 'pkg-006-2',
        product_id: 'prod-006',
        package_type: 'carton',
        package_label: 'Carton de 36 rouleaux',
        units_per_package: 36,
        is_base_unit: false,
      }
    ],
    prices: [
      {
        id: 'prc-006-1',
        product_id: 'prod-006',
        price_type_code: 'detail',
        amount_xof: 1750, // 1 750 FCFA le rouleau
      },
      {
        id: 'prc-006-2',
        product_id: 'prod-006',
        price_type_code: 'gros',
        amount_xof: 1400,
      },
      {
        id: 'prc-006-3',
        product_id: 'prod-006',
        price_type_code: 'revendeur',
        amount_xof: 1250,
      },
      {
        id: 'prc-006-4',
        product_id: 'prod-006',
        price_type_code: 'achat',
        amount_xof: 850,
      }
    ]
  }
];
