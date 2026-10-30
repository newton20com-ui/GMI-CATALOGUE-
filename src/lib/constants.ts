import { Category, PermissionDefinition, PriceType } from '../types';

export const CURRENCY = 'FCFA';

export const INITIAL_CATEGORIES: Omit<Category, 'id'>[] = [
  {
    name: "Imprimerie — Consommables",
    slug: "imprimerie-consommables",
    description: "Encres, plaques offset, blanchets, chimie et consommables divers d'imprimerie.",
    display_order: 1,
    is_active: true,
  },
  {
    name: "Imprimerie — Machines",
    slug: "imprimerie-machines",
    description: "Presses offset, duplicopieurs, massicots, plieuses et équipements d'imprimerie.",
    display_order: 2,
    is_active: true,
  },
  {
    name: "Imprimerie — Pièces",
    slug: "imprimerie-pieces",
    description: "Pièces détachées, rouleaux, courroies et moteurs pour presses et machines.",
    display_order: 3,
    is_active: true,
  },
  {
    name: "Sérigraphie — Consommables",
    slug: "serigraphie-consommables",
    description: "Encres plastisols, encres à l'eau, émulsions, solvants, toiles et cadres.",
    display_order: 4,
    is_active: true,
  },
  {
    name: "Sérigraphie — Machines",
    slug: "serigraphie-machines",
    description: "Carrousels manuels/automatiques, tunnels de séchage, flasheuses et insoleuses.",
    display_order: 5,
    is_active: true,
  },
  {
    name: "Sérigraphie — Pièces",
    slug: "serigraphie-pieces",
    description: "Racles de sérigraphie, contre-racles, mors, poignées et pièces détachées.",
    display_order: 6,
    is_active: true,
  },
  {
    name: "Articles divers",
    slug: "articles-divers",
    description: "Matériel de reliure, adhésifs industriels, outillage et fournitures diverses.",
    display_order: 7,
    is_active: true,
  },
];

export const INITIAL_PRICE_TYPES: PriceType[] = [
  {
    code: 'detail',
    label: 'Prix de détail',
    description: 'Tarif public standard visible par tous les employés connectés.',
    is_confidential: false,
    display_order: 1,
  },
  {
    code: 'gros',
    label: 'Prix de gros',
    description: 'Tarif grossiste réservé aux comptes autorisés.',
    is_confidential: true,
    display_order: 2,
  },
  {
    code: 'revendeur',
    label: 'Prix revendeur',
    description: 'Tarif accordé aux partenaires et revendeurs agréés.',
    is_confidential: true,
    display_order: 3,
  },
  {
    code: 'achat',
    label: "Prix d'achat",
    description: "Coût d'achat confidentiel de la marchandise.",
    is_confidential: true,
    display_order: 4,
  },
];

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'catalog:view',
    label: 'Consulter le catalogue',
    category: 'Catalogue',
    description: 'Permet de parcourir les articles, rechercher et voir les fiches produits et le prix de détail.',
  },
  {
    key: 'product:create',
    label: 'Créer des marchandises',
    category: 'Produits',
    description: "Permet d'ajouter de nouveaux produits et variantes au catalogue.",
  },
  {
    key: 'product:edit',
    label: 'Modifier des marchandises',
    category: 'Produits',
    description: 'Permet de modifier les caractéristiques, descriptions et conditionnements.',
  },
  {
    key: 'product:archive',
    label: 'Archiver des marchandises',
    category: 'Produits',
    description: 'Permet de retirer un produit du catalogue actif sans supprimer son historique.',
  },
  {
    key: 'photo:manage',
    label: 'Gérer les photographies',
    category: 'Photographies',
    description: 'Téléverser, ordonner, définir la photo principale et supprimer des images.',
  },
  {
    key: 'category:manage',
    label: 'Gérer les catégories',
    category: 'Catalogue',
    description: 'Ajouter, renommer et réorganiser les catégories de produits.',
  },
  {
    key: 'price:view:achat',
    label: "Voir le prix d'achat",
    category: 'Tarifs',
    description: "Accès en lecture au coût d'acquisition confidentiel de la marchandise.",
  },
  {
    key: 'price:view:gros',
    label: 'Voir le prix de gros',
    category: 'Tarifs',
    description: 'Accès en lecture à la grille tarifaire pour grossistes.',
  },
  {
    key: 'price:view:revendeur',
    label: 'Voir le prix revendeur',
    category: 'Tarifs',
    description: 'Accès en lecture à la grille tarifaire pour revendeurs agréés.',
  },
  {
    key: 'price:edit:detail',
    label: 'Modifier le prix de détail',
    category: 'Tarifs',
    description: "Permet d'ajuster le tarif public de détail.",
  },
  {
    key: 'price:edit:gros',
    label: 'Modifier le prix de gros',
    category: 'Tarifs',
    description: "Permet d'ajuster le tarif grossiste.",
  },
  {
    key: 'price:edit:revendeur',
    label: 'Modifier le prix revendeur',
    category: 'Tarifs',
    description: "Permet d'ajuster le tarif revendeur.",
  },
  {
    key: 'price:edit:achat',
    label: "Modifier le prix d'achat",
    category: 'Tarifs',
    description: "Permet d'ajuster le coût d'acquisition d'origine.",
  },
  {
    key: 'user:manage',
    label: 'Gérer les comptes utilisateurs',
    category: 'Administration',
    description: 'Inviter des employés, activer ou désactiver des accès.',
  },
  {
    key: 'permission:manage',
    label: 'Gérer les permissions',
    category: 'Administration',
    description: 'Attribuer ou révoquer les droits individuels des utilisateurs.',
  },
  {
    key: 'import:execute',
    label: 'Importer les anciennes références',
    category: 'Administration',
    description: 'Importer des lots de marchandises depuis un fichier CSV.',
  },
];

export const PACKAGE_TYPES = [
  { value: 'unite', label: 'Unité' },
  { value: 'piece', label: 'Pièce' },
  { value: 'paquet', label: 'Paquet' },
  { value: 'carton', label: 'Carton' },
  { value: 'lot', label: 'Lot' },
  { value: 'rouleau', label: 'Rouleau' },
  { value: 'litre', label: 'Litre' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'bidon', label: 'Bidon' },
  { value: 'bobine', label: 'Bobine' },
  { value: 'rame', label: 'Rame' },
];

export const IMAGE_VIEW_TYPES = [
  { value: 'principale', label: 'Photo principale du produit' },
  { value: 'carton_exterieur', label: 'Carton ou emballage extérieur' },
  { value: 'interieur_carton', label: 'Intérieur du carton' },
  { value: 'produit_deballe', label: 'Produit déballé' },
  { value: 'etiquette_reference', label: 'Étiquette et référence' },
  { value: 'details_techniques', label: 'Détails techniques' },
  { value: 'accessoires', label: 'Accessoires' },
  { value: 'autre', label: 'Autre vue' },
];

export function formatPriceFCFA(amount?: number | null): string {
  if (amount === undefined || amount === null) {
    return 'Non renseigné';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export function formatDateFr(dateString?: string): string {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}
