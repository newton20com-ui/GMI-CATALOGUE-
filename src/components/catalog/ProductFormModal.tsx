import React, { useState, useEffect } from 'react';
import { Product, Category, ProductStatus, ImageViewType } from '../../types';
import { IMAGE_VIEW_TYPES, PACKAGE_TYPES, INITIAL_PRICE_TYPES } from '../../lib/constants';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Camera, 
  Layers, 
  DollarSign, 
  Package, 
  Info, 
  Plus, 
  Trash2, 
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { catalogService } from '../../services/catalogService';

interface ProductFormModalProps {
  productToEdit?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: (savedProduct: Product) => void;
  userId?: string;
  canEditPrices: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  productToEdit,
  categories,
  onClose,
  onSuccess,
  userId,
  canEditPrices,
}) => {
  const isEditing = Boolean(productToEdit);

  // Form State
  const [name, setName] = useState(productToEdit?.name || '');
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || (categories[0]?.id || ''));
  const [brand, setBrand] = useState(productToEdit?.brand || '');
  const [modelReference, setModelReference] = useState(productToEdit?.model_reference || '');
  const [legacyReference, setLegacyReference] = useState(productToEdit?.legacy_reference || '');
  const [status, setStatus] = useState<ProductStatus>(productToEdit?.status || 'actif');
  
  // Descriptions
  const [shortDescription, setShortDescription] = useState(productToEdit?.short_description || '');
  const [detailedPresentation, setDetailedPresentation] = useState(productToEdit?.detailed_presentation || '');
  const [productUsage, setProductUsage] = useState(productToEdit?.product_usage || '');
  const [technicalSpecs, setTechnicalSpecs] = useState(productToEdit?.technical_specs || '');
  const [precautions, setPrecautions] = useState(productToEdit?.precautions || '');

  // Mots clés et tags
  const [keywordsText, setKeywordsText] = useState((productToEdit?.search_keywords || []).join(', '));
  const [altNamesText, setAltNamesText] = useState((productToEdit?.alternative_names || []).join(', '));

  // Conditionnement de base
  const [packages, setPackages] = useState<Array<{ package_type: string; package_label: string; units_per_package: number }>>(
    productToEdit?.packages && productToEdit.packages.length > 0
      ? productToEdit.packages.map(p => ({
          package_type: p.package_type,
          package_label: p.package_label,
          units_per_package: p.units_per_package,
        }))
      : [{ package_type: 'unite', package_label: 'Pièce unitaire', units_per_package: 1 }]
  );

  // Tarifs
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (productToEdit?.prices) {
      for (const p of productToEdit.prices) {
        map[p.price_type_code] = p.amount_xof.toString();
      }
    }
    return map;
  });

  // Photos téléversées
  interface FormPhotoItem {
    file: File;
    url: string;
    filename: string;
    view_type: ImageViewType;
    caption?: string;
  }
  const [uploadedPhotos, setUploadedPhotos] = useState<FormPhotoItem[]>([]);

  // État de validation & doublons
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Vérification de doublons en temps réel
  useEffect(() => {
    if (!name.trim()) {
      setDuplicateWarning(null);
      return;
    }
    // Ne pas tester contre soi-même si en édition
    const dupCheck = catalogService.checkDuplicates(name, legacyReference);
    if (dupCheck.isDuplicate && dupCheck.matchedProduct?.id !== productToEdit?.id) {
      setDuplicateWarning(`Attention : Un article similaire existe déjà (${dupCheck.matchedProduct?.internal_code} - ${dupCheck.matchedProduct?.name}). Raison : ${dupCheck.reason}.`);
    } else {
      setDuplicateWarning(null);
    }
  }, [name, legacyReference, productToEdit]);

  const handleAddPackage = () => {
    setPackages([...packages, { package_type: 'carton', package_label: 'Carton', units_per_package: 10 }]);
  };

  const handleRemovePackage = (index: number) => {
    if (packages.length <= 1) return;
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: FormPhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        url: previewUrl,
        filename: file.name,
        view_type: uploadedPhotos.length === 0 && i === 0 ? 'principale' : 'autre',
        caption: '',
      });
    }
    setUploadedPhotos(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Le nom principal de la marchandise est obligatoire.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Veuillez sélectionner une catégorie.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      // Conversion des mots clés
      const search_keywords = keywordsText
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const alternative_names = altNamesText
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      // Conversion des prix en nombres
      const formattedPrices: Record<string, number> = {};
      for (const [code, val] of Object.entries(prices)) {
        if (val.trim() !== '') {
          const num = parseFloat(val);
          if (!isNaN(num) && num >= 0) {
            formattedPrices[code] = num;
          }
        }
      }

      let saved: Product;

      if (isEditing && productToEdit) {
        saved = await catalogService.updateProduct(
          productToEdit.id,
          {
            name: name.trim(),
            category_id: categoryId,
            brand: brand.trim() || undefined,
            model_reference: modelReference.trim() || undefined,
            legacy_reference: legacyReference.trim() || undefined,
            short_description: shortDescription.trim() || undefined,
            detailed_presentation: detailedPresentation.trim() || undefined,
            product_usage: productUsage.trim() || undefined,
            technical_specs: technicalSpecs.trim() || undefined,
            precautions: precautions.trim() || undefined,
            status,
            search_keywords,
            alternative_names,
          },
          formattedPrices,
          userId,
          uploadedPhotos
        );
      } else {
        saved = await catalogService.createProduct({
          name: name.trim(),
          category_id: categoryId,
          brand: brand.trim() || undefined,
          model_reference: modelReference.trim() || undefined,
          legacy_reference: legacyReference.trim() || undefined,
          short_description: shortDescription.trim() || undefined,
          detailed_presentation: detailedPresentation.trim() || undefined,
          product_usage: productUsage.trim() || undefined,
          technical_specs: technicalSpecs.trim() || undefined,
          precautions: precautions.trim() || undefined,
          status,
          search_keywords,
          alternative_names,
          packages,
          prices: formattedPrices,
          images: uploadedPhotos,
          userId,
        });
      }

      // Recharger systématiquement pour garantir toutes les métadonnées et photos
      const fresh = await catalogService.getProductById(saved.id, () => true, true);
      onSuccess(fresh || saved);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement de la marchandise.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-modal overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? `Modifier la marchandise (${productToEdit?.internal_code})` : 'Ajouter une nouvelle marchandise'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seuls le nom et la catégorie sont obligatoires. Renseignez le reste progressivement.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error and Warnings */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Section 1: Identification */}
          <div>
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600 inline-block"></span>
              1. Identification & Catégorie
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom principal du produit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Encre Plastisol Textile Blanc Flash 5kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catégorie <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-field"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statut commercial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="input-field"
                >
                  <option value="actif">Actif (en vente / référence courante)</option>
                  <option value="a_verifier">À vérifier (importé ou incomplet)</option>
                  <option value="archive">Archivé (abandonné)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marque ou Fabricant
                </label>
                <input
                  type="text"
                  placeholder="Ex: Amex, Flint, Heidelberg, Vastex..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modèle ou Référence constructeur
                </label>
                <input
                  type="text"
                  placeholder="Ex: V-100, K+E 918, HR3..."
                  value={modelReference}
                  onChange={(e) => setModelReference(e.target.value)}
                  className="input-field font-mono text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ancienne référence GMI (Historique)
                </label>
                <input
                  type="text"
                  placeholder="Ex: ENC-001, REF-HIST-45..."
                  value={legacyReference}
                  onChange={(e) => setLegacyReference(e.target.value)}
                  className="input-field font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Facultatif. Conserve le lien avec les 531 anciennes références historiques.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Descriptions & Usages */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600 inline-block"></span>
              2. Descriptions & Utilisations
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description courte (1 à 2 phrases)
                </label>
                <input
                  type="text"
                  placeholder="Résumé pour les aperçus rapides..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Présentation détaillée
                </label>
                <textarea
                  rows={2}
                  placeholder="Présentation complète des qualités du produit..."
                  value={detailedPresentation}
                  onChange={(e) => setDetailedPresentation(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Utilisation du produit
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions d'application, supports compatibles, conseils atelier..."
                  value={productUsage}
                  onChange={(e) => setProductUsage(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caractéristiques techniques
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Viscosité, dureté shore, dimensions, température..."
                    value={technicalSpecs}
                    onChange={(e) => setTechnicalSpecs(e.target.value)}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Précautions d'emploi & conservation
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Conserver à l'abri du soleil, bien refermer..."
                    value={precautions}
                    onChange={(e) => setPrecautions(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mots-clés de recherche (séparés par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: blanc, flash, tee-shirt, plastisol, textile"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Conditionnements */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-600 inline-block"></span>
                3. Conditionnements & Unités
              </h3>
              <button
                type="button"
                onClick={handleAddPackage}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un conditionnement
              </button>
            </div>

            <div className="space-y-2">
              {packages.map((pkg, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Libellé (ex: Carton de 12)"
                      value={pkg.package_label}
                      onChange={(e) => {
                        const next = [...packages];
                        next[idx].package_label = e.target.value;
                        setPackages(next);
                      }}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div className="w-36">
                    <select
                      value={pkg.package_type}
                      onChange={(e) => {
                        const next = [...packages];
                        next[idx].package_type = e.target.value;
                        setPackages(next);
                      }}
                      className="input-field text-xs py-1.5"
                    >
                      {PACKAGE_TYPES.map(pt => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="Qté"
                      value={pkg.units_per_package}
                      onChange={(e) => {
                        const next = [...packages];
                        next[idx].units_per_package = parseFloat(e.target.value) || 1;
                        setPackages(next);
                      }}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  {packages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePackage(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Grilles Tarifaires (en FCFA) */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600 inline-block"></span>
              4. Tarification (en FCFA - XOF)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INITIAL_PRICE_TYPES.map((pt) => (
                <div key={pt.code} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      {pt.label}
                    </label>
                    {pt.is_confidential && (
                      <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        Protégé RLS
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Non renseigné"
                      value={prices[pt.code] || ''}
                      onChange={(e) => {
                        setPrices({
                          ...prices,
                          [pt.code]: e.target.value,
                        });
                      }}
                      className="input-field text-xs py-2 pr-14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Photographies */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-600 inline-block"></span>
              5. Photographies de la marchandise
            </h3>

            {/* Photos déjà enregistrées sur le produit */}
            {isEditing && productToEdit?.images && productToEdit.images.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Photographies enregistrées sur cette marchandise ({productToEdit.images.length}) :
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {productToEdit.images.map((img) => (
                    <div key={img.id} className="relative rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
                      <img src={img.public_url} alt="" className="w-full h-20 object-cover" />
                      <div className="p-1.5 text-[10px] bg-white border-t border-slate-100 flex items-center justify-between">
                        <span className="truncate text-slate-600 font-medium capitalize">
                          {IMAGE_VIEW_TYPES.find(vt => vt.value === img.view_type)?.label || img.view_type}
                        </span>
                        {img.is_primary && (
                          <span className="text-[9px] bg-brand-100 text-brand-800 font-bold px-1 rounded">Principale</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-bold text-brand-600 hover:text-brand-700 underline">
                  {isEditing && productToEdit?.images && productToEdit.images.length > 0 ? 'Ajouter d\'autres photographies' : 'Téléverser des photographies'}
                </span>
                <span className="text-xs text-slate-500"> depuis votre ordinateur ou smartphone</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                Formats acceptés : JPG, PNG, WEBP (Max 15 Mo par photo)
              </p>
            </div>

            {/* Aperçu des photos sélectionnées */}
            {uploadedPhotos.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs font-semibold text-slate-700">
                  Photos prêtes à être envoyées ({uploadedPhotos.length}) :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedPhotos.map((photo, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <img src={photo.url} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <select
                          value={photo.view_type}
                          onChange={(e) => {
                            const next = [...uploadedPhotos];
                            next[i].view_type = e.target.value as ImageViewType;
                            setUploadedPhotos(next);
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                        >
                          {IMAGE_VIEW_TYPES.map(vt => (
                            <option key={vt.value} value={vt.value}>{vt.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-secondary text-xs py-2 px-4"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary text-xs py-2 px-5 gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isEditing ? 'Enregistrer les modifications' : 'Créer la marchandise'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
