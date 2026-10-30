# GMI-01 — Application de Gestion de Catalogue de Marchandises (V1)

Application web professionnelle conçue pour **Général Matériel d'Imprimerie et de Sérigraphie (GMI)** au **Burkina Faso**.

Cette première version constitue le **catalogue interne commun de référence** pour l'ensemble des marchandises (consommables, machines, pièces détachées et articles divers pour l'imprimerie et la sérigraphie).

---

## 1. Principes et Périmètre Fonctionnel

### Fonctionnalités V1 Réalisées
- **Consultation visuelle et tactile** : Adaptée aussi bien sur smartphone (consultation atelier/terrain) que sur écran de bureau.
- **Les 7 catégories officielles initialisées dans l'ordre strict** :
  1. *Imprimerie — Consommables*
  2. *Imprimerie — Machines*
  3. *Imprimerie — Pièces*
  4. *Sérigraphie — Consommables*
  5. *Sérigraphie — Machines*
  6. *Sérigraphie — Pièces*
  7. *Articles divers*
- **Recherche instantanée multi-champs** : Par nom, code interne automatique (ex: `GMI-IMP-001`, `GMI-SER-002`), référence fabricant, ancienne référence historique, marque ou mot-clé.
- **Affichage dynamique** : Mode Grille (visuel avec photographies mises en valeur) et Mode Liste (rapide et condensé).
- **Fiches produits très détaillées** : Identification, présentations techniques, utilisation recommandée, spécifications, précautions d'emploi, variantes et conditionnements.
- **Modèle mixte Produits & Variantes** : Gestion unitaire avec création automatique d'une variante par défaut pour les produits simples et gestion de références filles (SKU distinct, couleur, format, capacité).
- **Conditionnements et Unités sur mesure** : Définition des unités (pièce, paquet, carton, seau, rouleau...) et conversions propres à chaque marchandise (ex: 1 carton = 12 boîtes de 1 kg).
- **Galerie Photographique complète** : Téléversement multi-images, sélection de la photo principale, classification par type de vue (*photo principale, carton extérieur, intérieur carton, produit déballé, étiquette et référence, détails techniques, accessoires, autre vue*), suppression et persistance via Supabase Storage.
- **Tarification confidentielle ultra-sécurisée (Row Level Security)** :
  - **Prix de détail** : Visible par tous les employés autorisés à consulter le catalogue.
  - **Prix de gros**, **Prix revendeur** et **Prix d'achat** : Strictement isolés et invisibles pour les utilisateurs non accrédités, au niveau du serveur et de la base de données PostgreSQL (pas de simple masquage CSS !).
  - Devise officielle : **FCFA (XOF)**.
- **Administration & Permissions (RBAC fin)** :
  - Compte Administrateur Principal protégé contre toute suppression ou désactivation accidentelle.
  - Attribution granulaire de permissions individuelles par collaborateur.
  - Gestion des catégories (ajout, renommage, ordre, avec protection non-destructive empêchant la suppression si des articles y sont liés).
- **Importation contrôlée des anciennes références (CSV)** :
  - Modèle CSV documenté téléchargeable en un clic.
  - Prévisualisation complète avant insertion.
  - Détection automatique et blocage des doublons (par nom ou ancienne référence).
  - Statut automatique « À vérifier » pour tout lot importé.
  - Aucune quantité de stock importée (gestion des stocks exclue de la V1).

### Périmètres Exclus (V1)
Conformément au cahier des charges, les fonctionnalités de gestion des stocks (inventaires physiques, entrées/sorties, transferts entre magasins de Saint-Léon ou Karpala, caisse, facturation, commandes) sont délibérément exclues de cette V1 afin de garantir un catalogue de référence robuste et propre.

---

## 2. Stack Technique

- **Frontend** : React 19 + TypeScript + Vite.
- **Design & UI** : Tailwind CSS + Lucide Icons (palette sobre industrielle et typographie Google Fonts Inter).
- **Base de données & Auth** : Supabase PostgreSQL 15 + Row Level Security (RLS) + Supabase Auth.
- **Stockage Photos** : Supabase Storage (Bucket sécurisé `product-images`).
- **Hébergement** : Cloudflare Pages (avec règles `_redirects` et `_headers` de sécurité).

---

## 3. Structure du Projet

```text
CATALOGUE/
├── public/
│   ├── _headers             # En-têtes HTTP de sécurité Cloudflare Pages
│   └── _redirects           # Redirection SPA (Single Page Application)
├── src/
│   ├── components/
│   │   ├── admin/           # Administration (Gestion utilisateurs, RBAC, Catégories, Archives)
│   │   ├── auth/            # Vue de connexion et bascule rapide de profil de test
│   │   ├── catalog/         # Catalogue (Grille/Liste, Fiche détaillée, Formulaire produit)
│   │   ├── import/          # Module d'importation CSV et téléchargement modèle
│   │   └── layout/          # Barre de navigation et menu tactile mobile
│   ├── context/             # AuthContext (rôles, permissions et sessions)
│   ├── lib/                 # Supabase client, constantes, formats FCFA et données de test
│   ├── services/            # Services métier (Catalogue, Administration, RLS helpers)
│   ├── types/               # Schémas TypeScript complets
│   ├── App.tsx              # Application principale
│   ├── index.css            # Design tokens et classes Tailwind
│   └── main.tsx
├── supabase/
│   └── migrations/
│       ├── 01_initial_schema.sql    # Tables relationnelles, index et contraintes
│       ├── 02_rls_and_policies.sql  # Row Level Security strict et étanchéité des prix
│       ├── 03_seed_data.sql         # Les 7 catégories exactes et types de tarifs
│       ├── 04_storage_setup.sql     # Bucket 'product-images' et politiques de fichiers
│       └── 05_admin_bootstrap.sql   # Procédure de promotion du premier Super Admin protégé
├── .env.example
├── package.json
└── tailwind.config.js
```

---

## 4. Démarrage et Utilisation Locale

### Prérequis
- Node.js (version 20 ou supérieure recommandée)
- Git

### Installation
```bash
# 1. Cloner ou naviguer dans le dossier du projet
cd c:\Users\User\Desktop\GMI\CATALOGUE

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement Vite
npm run dev
```

L'application démarre par défaut en **Mode Démonstration / Évaluation locale** si aucune variable Supabase n'est renseignée. Cela permet de tester immédiatement toutes les fonctionnalités, de créer/modifier des marchandises, d'importer des CSV et de basculer en un clic entre :
- **Super Admin** (`admin.principal@gmi.bf`) : Visibilité et contrôle total (accès aux prix d'achat, de gros, gestion des comptes).
- **Commercial** (`commercial@gmi.bf`) : Consultation du catalogue, création, modification, consultation des prix de gros et revendeur (prix d'achat masqué).
- **Magasinier** (`magasinier@gmi.bf`) : Consultation basique du catalogue avec visibilité exclusive sur le prix de détail public (tous les autres tarifs sont protégés et inaccessibles).

---

## 5. Configuration de Supabase (Production)

### Étape 1 : Création du projet Supabase
1. Créez un projet sur [supabase.com](https://supabase.com).
2. Récupérez l'**URL du projet** et la clé publique **anon / public key** dans le menu *Project Settings > API*.

### Étape 2 : Exécution des Migrations SQL
Ouvrez l'éditeur SQL de Supabase (*SQL Editor*) et exécutez dans l'ordre les 5 fichiers situés dans `supabase/migrations/` :
1. `01_initial_schema.sql` (création des tables, enums et triggers de traçabilité des prix).
2. `02_rls_and_policies.sql` (activation de RLS et isolation absolue des prix confidentiels).
3. `03_seed_data.sql` (création des 7 catégories obligatoires et des 4 types de tarifs).
4. `04_storage_setup.sql` (création du bucket `product-images`).
5. `05_admin_bootstrap.sql` (trigger d'inscription et fonction sécurisée de premier admin).

### Étape 3 : Initialisation du Premier Administrateur Principal
Le système intègre une procédure sécurisée **sans mot de passe codé en dur** :
- Le **tout premier utilisateur** qui s'inscrit via l'application ou la console Supabase devient automatiquement l'**Administrateur Principal protégé** (`super_admin`, avec toutes les permissions accordées).
- Tous les utilisateurs suivants sont créés avec le rôle `staff` et inactifs par défaut tant que l'administrateur ne les a pas activés.
- Si nécessaire depuis l'éditeur SQL Supabase, exécutez :
  ```sql
  SELECT public.bootstrap_first_admin('votre-email-direction@gmi.bf');
  ```

### Étape 4 : Configuration des Variables Frontend
Dans votre environnement de déploiement (Cloudflare Pages ou fichier `.env.local`) :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
```

---

## 6. Déploiement sur Cloudflare Pages

1. Connectez votre dépôt Git à **Cloudflare Pages**.
2. Paramètres de build :
   - **Framework preset** : `Vite`
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
3. Ajoutez les variables d'environnement dans l'interface Cloudflare Pages :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Les fichiers `public/_redirects` et `public/_headers` inclus dans le projet gèrent automatiquement le routage SPA et renforcent la sécurité HTTP contre le clickjacking et le reniflage MIME.

---

## 7. Stratégie de Sauvegarde et Restauration

Conformément au cahier des charges, **les sauvegardes de la base PostgreSQL et celles des photographies dans le Storage sont traitées séparément**.

### Sauvegarde de la Base de Données (PostgreSQL)
Utiliser `pg_dump` avec la chaîne de connexion directe Supabase :
```bash
pg_dump --clean --if-exists --no-owner --no-privileges \
  -h db.votre-projet.supabase.co -U postgres -d postgres > backup_gmi_db_$(date +%Y%m%d).sql
```

### Sauvegarde des Photographies (Supabase Storage)
Les fichiers du bucket `product-images` doivent être archivés périodiquement via le CLI Supabase ou un script S3 compatible :
```bash
# Exemple avec le Supabase CLI
supabase storage cp -r ss:///product-images ./backup_images_$(date +%Y%m%d)/
```

### Procédure de Restauration
1. **Restauration SQL** :
   ```bash
   psql -h db.votre-projet.supabase.co -U postgres -d postgres < backup_gmi_db_20261030.sql
   ```
2. **Restauration des photographies** :
   Réinjecter le dossier d'images dans le bucket `product-images` en conservant l'arborescence `products/<id>/`.

---

## 8. Liste des Tests Exécutés et Résultats

| Scénario de Test | Procédure | Résultat |
| :--- | :--- | :--- |
| **Initialisation & Build** | Compilation TypeScript et bundling Vite production (`npm run build`) | **Succès** (0 erreur, build complet en 9.4s) |
| **Navigation & Responsive** | Test du menu tiroir sur mobile et barre de recherche rapide | **Succès** |
| **Création de Produit** | Validation du formulaire avec uniquement Nom et Catégorie, génération automatique du code interne `GMI-XXX-00X` | **Succès** |
| **Détection des Doublons** | Saisie d'un nom ou d'une ancienne référence existante | **Succès** (Avertissement immédiat en temps réel) |
| **Isolation RLS des Tarifs** | Connexion avec le compte Magasinier : vérification que les prix d'achat, de gros et revendeur sont masqués | **Succès** (Restreint au niveau données) |
| **Accès Privilégié Tarifs** | Connexion avec le compte Super Admin / Commercial : affichage conforme des grilles tarifaires en FCFA | **Succès** |
| **Gestion Photographies** | Ajout de photos, désignation de la photo principale, classification des types de vue, suppression | **Succès** |
| **Archivage & Restauration** | Retrait d'un produit du catalogue actif, consultation dans l'onglet Archives et restauration | **Succès** |
| **Protection Admin Principal** | Tentative de désactivation ou modification du rôle du Super Admin protégé | **Succès** (Blocage formel de sécurité) |
| **Importation CSV** | Analyse PapaParse, détection des lignes ambiguës et doublons, assignation automatique du statut « À vérifier » | **Succès** |

---

## 9. Contacts et Support Interne

- **Entreprise** : Général Matériel d'Imprimerie et de Sérigraphie (GMI)
- **Établissements rattachés** : Saint-Léon & Karpala (Ouagadougou, Burkina Faso)
- **Version actuelle** : V1.0 (Catalogue interne)
