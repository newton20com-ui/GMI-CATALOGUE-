import React, { useState } from 'react';
import { Product, ProductImage, PermissionKey, ImageViewType, UserProfile } from '../../types';
import { formatPriceFCFA, formatDateFr, IMAGE_VIEW_TYPES, INITIAL_PRICE_TYPES } from '../../lib/constants';
import { 
  X, 
  Tag, 
  Package, 
  Layers, 
  DollarSign, 
  Edit3, 
  Archive, 
  RefreshCw, 
  Camera, 
  Trash2, 
  Star, 
  Maximize2, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { catalogService } from '../../services/catalogService';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onRefresh: () => void;
  hasPermission: (perm: PermissionKey) => boolean;
  isSuperAdmin: boolean;
  currentUser?: UserProfile | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit,
  onRefresh,
  hasPermission,
  isSuperAdmin,
  currentUser,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'variants' | 'prices' | 'photos'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Permissions spécifiques
  const canEdit = hasPermission('product:edit');
  const canArchive = hasPermission('product:archive');
  const canManagePhotos = hasPermission('photo:manage');

  // Sécurité stricte : la suppression définitive est réservée EXCLUSIVEMENT aux administrateurs
  const canDelete = isSuperAdmin || (currentUser?.role === 'admin' && hasPermission('product:archive'));

  const images = product.images && product.images.length > 0
    ? product.images
    : product.primary_image ? [product.primary_image] : [];

  const currentImage: ProductImage | undefined = images[activeImageIndex] || images[0];

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!canManagePhotos) return;
    setIsProcessing(true);
    setActionError('');
    try {
      await catalogService.setPrimaryImage(product.id, imageId);
      setActionSuccess('Photographie principale mise à jour.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteImage = async (imageId: string, storagePath?: string) => {
    if (!canManagePhotos) return;
    if (!window.confirm('Confirmer la suppression de cette photographie ?')) return;
    setIsProcessing(true);
    setActionError('');
    try {
      await catalogService.deleteImage(product.id, imageId, storagePath);
      setActionSuccess('Photographie supprimée avec succès.');
      setActiveImageIndex(0);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (!canArchive) return;
    const confirmVal = window.prompt(
      `ATTENTION : Suppression définitive de l'article :\n"${product.name}" (${product.internal_code})\n\nTous ses conditionnements, tarifs et photos seront définitivement effacés.\n\nPour confirmer, tapez SUPPRIMER :`
    );
    if (confirmVal !== 'SUPPRIMER') {
      if (confirmVal !== null) {
        alert('Suppression annulée : mot de confirmation non saisi.');
      }
      return;
    }

    setIsProcessing(true);
    setActionError('');
    try {
      await catalogService.deleteProductPermanently(product.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la suppression.');
      setIsProcessing(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!canArchive) return;
    setIsProcessing(true);
    setActionError('');
    try {
      if (product.status === 'archive') {
        await catalogService.restoreProduct(product.id);
        setActionSuccess('Marchandise restaurée avec succès dans le catalogue actif.');
      } else {
        if (!window.confirm(`Confirmez-vous l'archivage de "${product.name}" ? Il ne sera plus visible dans le catalogue actif.`)) {
          setIsProcessing(false);
          return;
        }
        await catalogService.archiveProduct(product.id);
        setActionSuccess('Marchandise archivée.');
      }
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors du changement de statut.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getViewTypeLabel = (typeKey?: string) => {
    const found = IMAGE_VIEW_TYPES.find(v => v.value === typeKey);
    return found?.label || 'Vue standard';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-modal overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-xs">
              {product.internal_code}
            </span>
            <span className="text-xs font-medium text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
              {product.category?.name || 'Catégorie'}
            </span>
            {product.status === 'a_verifier' && (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                À vérifier
              </span>
            )}
            {product.status === 'archive' && (
              <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Archive className="w-3.5 h-3.5" />
                Archivé
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(product)}
                className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
                title="Modifier les informations"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            {canArchive && (
              <>
                <button
                  onClick={handleToggleArchive}
                  disabled={isProcessing}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1.5 hover:text-amber-700"
                  title={product.status === 'archive' ? 'Restaurer le produit' : 'Archiver le produit'}
                >
                  {product.status === 'archive' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Restaurer</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Archiver</span>
                    </>
                  )}
                </button>
              </>
            )}

            {canDelete && (
              <button
                onClick={handleDeletePermanently}
                disabled={isProcessing}
                className="btn-secondary text-xs py-1.5 px-2.5 gap-1 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                title="Supprimer définitivement cet article (Réservé aux administrateurs)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {actionSuccess && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          
          {/* Top Title & Brand */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {product.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
              {product.brand && (
                <div>
                  <span className="text-slate-400 font-medium">Marque :</span>{' '}
                  <strong className="text-slate-800 font-semibold">{product.brand}</strong>
                </div>
              )}
              {product.model_reference && (
                <div>
                  <span className="text-slate-400 font-medium">Modèle constructeur :</span>{' '}
                  <strong className="text-slate-800 font-mono">{product.model_reference}</strong>
                </div>
              )}
              {product.legacy_reference && (
                <div>
                  <span className="text-slate-400 font-medium">Ancienne réf. GMI :</span>{' '}
                  <span className="font-mono bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                    {product.legacy_reference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Photo Gallery */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* Main Active Photo */}
              <div className="relative flex-1 aspect-[16/10] sm:aspect-[16/10] bg-slate-900/5 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                {currentImage?.public_url ? (
                  <>
                    <img
                      src={currentImage.public_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* View type tag & Caption */}
                    <div className="absolute top-3 left-3 bg-slate-900/80 text-white text-[11px] font-medium px-2.5 py-1 rounded backdrop-blur-md">
                      {getViewTypeLabel(currentImage.view_type)}
                    </div>

                    {currentImage.is_primary && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-white" />
                        Principale
                      </div>
                    )}

                    {currentImage.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-xs p-2.5 backdrop-blur-sm text-center">
                        {currentImage.caption}
                      </div>
                    )}

                    {/* Actions on this photo (if canManagePhotos) */}
                    {canManagePhotos && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                        {!currentImage.is_primary && (
                          <button
                            onClick={() => handleSetPrimaryImage(currentImage.id)}
                            className="bg-white/90 hover:bg-white text-slate-800 text-[10px] font-semibold px-2 py-1 rounded shadow-sm hover:shadow flex items-center gap-1"
                            title="Définir comme photo principale"
                          >
                            <Star className="w-3 h-3 text-amber-500" />
                            Définir principale
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteImage(currentImage.id, currentImage.storage_path)}
                          className="bg-rose-600/90 hover:bg-rose-600 text-white p-1 rounded shadow-sm"
                          title="Supprimer cette photographie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Camera className="w-12 h-12 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-medium">Aucune photographie enregistrée</p>
                    {canManagePhotos && (
                      <p className="text-[11px] text-brand-600 mt-1">
                        Utilisez le bouton "Modifier" pour téléverser des photos.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Thumbnails strip (Desktop & Mobile) */}
              {images.length > 1 && (
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:w-32 max-h-72 pb-1 md:pb-0 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-full md:h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                      {img.is_primary && (
                        <div className="absolute bottom-0 right-0 bg-amber-500 text-white p-0.5 rounded-tl">
                          <Star className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Info className="w-4 h-4" />
              Description & Utilisation
            </button>
            <button
              onClick={() => setActiveTab('variants')}
              className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
                activeTab === 'variants'
                  ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Variantes & Conditionnements
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
                activeTab === 'prices'
                  ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Grilles Tarifaires ({product.prices?.length || 0})
            </button>
          </div>

          {/* TAB 1: Informations, Descriptions, Utilisation, Précautions */}
          {activeTab === 'info' && (
            <div className="space-y-5 text-sm">
              
              {product.short_description && (
                <div className="bg-brand-50/50 border border-brand-100 rounded-xl p-4 text-slate-800">
                  <span className="text-xs font-bold text-brand-900 uppercase tracking-wider block mb-1">
                    Résumé
                  </span>
                  <p className="leading-relaxed">{product.short_description}</p>
                </div>
              )}

              {product.detailed_presentation && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Présentation détaillée
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-lg border border-slate-200">
                    {product.detailed_presentation}
                  </p>
                </div>
              )}

              {product.product_usage && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Utilisation recommandée
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-lg border border-slate-200">
                    {product.product_usage}
                  </p>
                </div>
              )}

              {product.technical_specs && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Caractéristiques techniques
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono text-xs">
                    {product.technical_specs}
                  </p>
                </div>
              )}

              {product.precautions && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                  <span className="font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Informations & Précautions importantes
                  </span>
                  <p className="leading-relaxed">{product.precautions}</p>
                </div>
              )}

              {/* Mots clés & noms alternatifs */}
              {(product.alternative_names?.length > 0 || product.search_keywords?.length > 0) && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                  {product.alternative_names?.map((alt, i) => (
                    <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      Alt: {alt}
                    </span>
                  ))}
                  {product.search_keywords?.map((kw, i) => (
                    <span key={i} className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Variantes et Conditionnements */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              
              {/* Variantes */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Variantes commercialisables
                </h4>
                <div className="space-y-2">
                  {(product.variants && product.variants.length > 0) ? (
                    product.variants.map((variant) => (
                      <div key={variant.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{variant.variant_name}</span>
                            {variant.is_default && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-medium">
                                Référence par défaut
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-slate-500 text-[11px]">SKU: {variant.sku}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          {variant.color && <span>Couleur : <strong>{variant.color}</strong></span>}
                          {variant.capacity && <span>Capacité : <strong>{variant.capacity}</strong></span>}
                          {variant.size_format && <span>Format : <strong>{variant.size_format}</strong></span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Aucune variante spécifique (référence unitaire).</p>
                  )}
                </div>
              </div>

              {/* Conditionnements et Unités */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Conditionnements & Unités de conversion
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(product.packages && product.packages.length > 0) ? (
                    product.packages.map((pkg) => (
                      <div key={pkg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800">{pkg.package_label}</span>
                          {pkg.is_base_unit && (
                            <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Unité de base
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          Type : <strong className="capitalize text-slate-700">{pkg.package_type}</strong> • Ratio : {pkg.units_per_package} unité(s)
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 col-span-2">
                      Conditionnement standard unitaire.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Tarifs Protégés (Row Level Security / Permissions) */}
          {activeTab === 'prices' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between bg-slate-100/80 p-3 rounded-lg text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="w-4 h-4 text-brand-600" />
                  Tarifs contrôlés par permissions de sécurité
                </span>
                <span className="text-[11px] text-slate-500">Devise : FCFA (XOF)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INITIAL_PRICE_TYPES.map((pt) => {
                  const currentPrice = product.prices?.find(p => p.price_type_code === pt.code);
                  
                  // L'utilisateur a-t-il le droit de voir ce prix ?
                  const canView = isSuperAdmin || pt.code === 'detail' || hasPermission(`price:view:${pt.code}` as PermissionKey);

                  return (
                    <div
                      key={pt.code}
                      className={`p-4 rounded-xl border transition-all ${
                        pt.code === 'detail'
                          ? 'bg-brand-50/40 border-brand-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{pt.label}</span>
                        {pt.is_confidential && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            Confidentiel
                          </span>
                        )}
                      </div>

                      {canView ? (
                        <div>
                          <div className="text-lg font-bold text-slate-900 tracking-tight">
                            {formatPriceFCFA(currentPrice?.amount_xof)}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{pt.description}</p>
                        </div>
                      ) : (
                        <div className="py-2 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                          <span className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                            Accès restreint (Permission requise)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>
                  Les prix de gros, revendeur et d'achat sont strictement protégés au niveau de la base de données (Row Level Security). Seuls les utilisateurs expressément autorisés peuvent les afficher ou les modifier.
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Footer Meta */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Créé le : {formatDateFr(product.created_at)}</span>
            <span>•</span>
            <span>Modifié le : {formatDateFr(product.updated_at)}</span>
          </div>
          <div>
            Identifiant technique : <span className="font-mono">{product.id}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
