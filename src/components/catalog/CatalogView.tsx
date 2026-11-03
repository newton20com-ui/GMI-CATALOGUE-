import React, { useState, useMemo } from 'react';
import { Product, Category, ProductStatus } from '../../types';
import { formatPriceFCFA, getProductShareUrl } from '../../lib/constants';
import { 
  LayoutGrid, 
  List, 
  Image as ImageIcon, 
  AlertTriangle, 
  Archive, 
  Plus, 
  ChevronRight,
  Share2,
  Check
} from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  statusFilter: ProductStatus | 'all';
  setStatusFilter: (st: ProductStatus | 'all') => void;
  onSelectProduct: (product: Product) => void;
  onOpenNewProduct: () => void;
  onOpenImport: () => void;
  canCreate: boolean;
  canImport: boolean;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  categories,
  loading,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  statusFilter,
  setStatusFilter,
  onSelectProduct,
  onOpenNewProduct,
  onOpenImport,
  canCreate,
  canImport,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'recent'>('recent');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleQuickShare = async (product: Product) => {
    const shareUrl = getProductShareUrl(product);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${product.internal_code} — ${product.name}`,
          text: `Catalogue GMI : ${product.name} (${product.internal_code})`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage(`Lien copié : ${product.internal_code}`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Erreur copie presse-papier:', err);
    }
  };

  // Filtrage et Tri
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'fr');
      }
      if (sortBy === 'code') {
        return a.internal_code.localeCompare(b.internal_code);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, sortBy]);

  // Fonction pour extraire le prix de détail public s'il existe
  const getDetailPrice = (product: Product): number | null => {
    const detailPrc = product.prices?.find(p => p.price_type_code === 'detail');
    return detailPrc?.amount_xof ?? null;
  };

  // Couleurs distinctives par type de catégorie
  const getCategoryBadgeClass = (categoryName?: string) => {
    if (!categoryName) return 'bg-slate-100 text-slate-700';
    const lower = categoryName.toLowerCase();
    if (lower.includes('sérigraphie') || lower.includes('serigraphie')) {
      return 'bg-amber-50 text-amber-800 border border-amber-200/80';
    }
    if (lower.includes('imprimerie')) {
      return 'bg-sky-50 text-sky-800 border border-sky-200/80';
    }
    return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Controls: Catégories & View Modes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        
        {/* Catégories scrollables horizontalement */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toutes les catégories ({products.length})
          </button>
          
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* View Switcher & Sorting */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif uniquement</option>
            <option value="a_verifier">À vérifier</option>
            <option value="archive">Archivés</option>
          </select>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="recent">Plus récents</option>
            <option value="name">Nom (A-Z)</option>
            <option value="code">Code GMI</option>
          </select>

          {/* Grid / List toggle */}
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affichage grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Affichage liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Chargement des références du catalogue...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        /* Empty State */
        <div className="card-container p-12 text-center max-w-lg mx-auto my-8 border-dashed border-2 border-slate-300">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Aucune marchandise trouvée</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {searchQuery
              ? `Aucun résultat pour la recherche "${searchQuery}". Essayez avec un autre mot-clé ou filtre.`
              : 'Le catalogue est actuellement vide ou aucun article ne correspond aux filtres appliqués.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {canCreate && (
              <button onClick={onOpenNewProduct} className="btn-primary text-xs py-2 px-4 gap-1.5">
                <Plus className="w-4 h-4" />
                Créer une fiche produit
              </button>
            )}
            {canImport && (
              <button onClick={onOpenImport} className="btn-secondary text-xs py-2 px-4 gap-1.5">
                Importer le fichier CSV
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedProducts.map((product) => {
            const detailPrice = getDetailPrice(product);
            const primaryImg = product.primary_image || product.images?.[0];

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="card-container group cursor-pointer hover:shadow-card hover:border-brand-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Thumbnail */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    {primaryImg?.public_url ? (
                      <img
                        src={primaryImg.public_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 stroke-1 mb-1" />
                        <span className="text-[11px] font-medium">Sans photographie</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {product.status === 'a_verifier' && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          <AlertTriangle className="w-3 h-3" />
                          À vérifier
                        </span>
                      )}
                      {product.status === 'archive' && (
                        <span className="inline-flex items-center gap-1 bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          <Archive className="w-3 h-3" />
                          Archivé
                        </span>
                      )}
                    </div>

                    {/* Code GMI Tag */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="bg-slate-900/90 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded shadow backdrop-blur-sm">
                        {product.internal_code}
                      </span>
                    </div>

                    {/* Images count if multiple */}
                    {(product.images?.length || 0) > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                        <ImageIcon className="w-3 h-3" />
                        <span>{product.images?.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-4">
                    {/* Category */}
                    <div className="mb-2">
                      <span className={`badge-category ${getCategoryBadgeClass(product.category?.name)}`}>
                        {product.category?.name || 'Général'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-brand-700 transition-colors">
                      {product.name}
                    </h3>

                    {/* Secondary meta */}
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {product.brand && (
                        <p className="truncate">
                          <span className="text-slate-400">Marque :</span> <strong className="text-slate-700">{product.brand}</strong>
                        </p>
                      )}
                      {product.legacy_reference && (
                        <p className="truncate font-mono text-[11px]">
                          <span className="text-slate-400">Anc. Réf :</span> {product.legacy_reference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer with Detail Price */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                      Prix de détail
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatPriceFCFA(detailPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickShare(product);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200 transition-colors"
                      title="Partager ou copier le lien direct de cet article"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card-container divide-y divide-slate-100">
          {sortedProducts.map((product) => {
            const detailPrice = getDetailPrice(product);
            const primaryImg = product.primary_image || product.images?.[0];

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="p-3 sm:p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Small Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 relative border border-slate-200">
                    {primaryImg?.public_url ? (
                      <img
                        src={primaryImg.public_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6 stroke-1" />
                      </div>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {product.internal_code}
                      </span>
                      <span className={`badge-category ${getCategoryBadgeClass(product.category?.name)}`}>
                        {product.category?.name}
                      </span>
                      {product.status === 'a_verifier' && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                          À vérifier
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-slate-900 text-sm truncate group-hover:text-brand-700">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {product.brand && <span>Marque: {product.brand}</span>}
                      {product.legacy_reference && <span className="font-mono">Réf: {product.legacy_reference}</span>}
                    </div>
                  </div>
                </div>

                {/* Price and Action */}
                <div className="text-right flex-shrink-0 flex items-center gap-2 sm:gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Prix détail</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatPriceFCFA(detailPrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickShare(product);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                    title="Partager ou copier le lien direct"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast confirmation de copie */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
