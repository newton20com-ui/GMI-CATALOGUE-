import React, { useState } from 'react';
import Papa from 'papaparse';
import { 
  X, 
  UploadCloud, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Check,
  RefreshCw,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { catalogService } from '../../services/catalogService';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

interface ParsedRow {
  name: string;
  category_name: string;
  legacy_reference?: string;
  brand?: string;
  model_reference?: string;
  short_description?: string;
  detail_price?: number;
  wholesale_price?: number;
  reseller_price?: number;
  purchase_price?: number;
  isDuplicate?: boolean;
  duplicateReason?: string;
  isValid: boolean;
  error?: string;
}

// Fonction de normalisation des clés d'en-tête (retire accents, BOM, espaces, minuscules)
function normalizeKey(str: string): string {
  return str
    .replace(/^\ufeff/, '') // Retirer le Byte Order Mark UTF-8
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Retirer accents
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess, userId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [allowDuplicates, setAllowDuplicates] = useState(true); // Par défaut tolérant pour ne pas bloquer l'utilisateur
  const [manualNameColumn, setManualNameColumn] = useState<string>('');

  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    duplicateCount: number;
    errors: string[];
  } | null>(null);

  // Télécharger le modèle CSV
  const handleDownloadTemplate = () => {
    const csvContent = 
      "nom_produit;categorie;ancienne_reference;marque;modele;prix_detail;prix_gros;prix_revendeur;prix_achat;description_courte\n" +
      "Encre Plastisol Blanc Flash 5kg;Sérigraphie — Consommables;PLAST-BLC-05;Amex;White Extra Flash;38500;33000;31000;24000;Encre textile opaque haute densité\n" +
      "Raclette bois 30 cm;Sérigraphie — Pièces;RACL-BOIS-30;Fimor;Lame 70Sh;12500;10500;9500;7000;Racle manuelle manche bois\n" +
      "Plaques Offset CtP 0.30mm;Imprimerie — Consommables;PLAQ-CTP-01;Agfa;Energy Elite;45000;40000;38000;30000;Plaque thermique sans chimie";

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_catalogue_gmi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCsvData = (data: any[], headers: string[], forcedNameCol?: string) => {
    const rows: ParsedRow[] = [];

    // Déterminer automatiquement les clés correspondant à chaque champ
    let nameKey = forcedNameCol || '';
    let catKey = '';
    let refKey = '';
    let brandKey = '';
    let modelKey = '';
    let descKey = '';
    let detailPriceKey = '';
    let wholesalePriceKey = '';
    let resellerPriceKey = '';
    let purchasePriceKey = '';

    for (const h of headers) {
      const norm = normalizeKey(h);
      if (!nameKey && (norm.includes('nom') || norm.includes('designation') || norm.includes('article') || norm.includes('produit') || norm.includes('libelle') || norm.includes('item') || norm.includes('description_courte'))) {
        nameKey = h;
      }
      if (!catKey && (norm.includes('cat') || norm.includes('famille') || norm.includes('rubrique') || norm.includes('type'))) {
        catKey = h;
      }
      if (!refKey && (norm.includes('ref') || norm.includes('code') || norm.includes('anc') || norm.includes('sku') || norm.includes('num'))) {
        refKey = h;
      }
      if (!brandKey && (norm.includes('marque') || norm.includes('brand') || norm.includes('fabriquant') || norm.includes('fabricant'))) {
        brandKey = h;
      }
      if (!modelKey && (norm.includes('model') || norm.includes('version'))) {
        modelKey = h;
      }
      if (!descKey && (norm.includes('desc') || norm.includes('info') || norm.includes('detail') || norm.includes('note'))) {
        descKey = h;
      }
      if (!detailPriceKey && (norm.includes('detail') || (norm.includes('prix') && !norm.includes('gros') && !norm.includes('revendeur') && !norm.includes('achat')) || norm.includes('vente') || norm.includes('pu') || norm.includes('pv'))) {
        detailPriceKey = h;
      }
      if (!wholesalePriceKey && norm.includes('gros')) {
        wholesalePriceKey = h;
      }
      if (!resellerPriceKey && (norm.includes('revendeur') || norm.includes('partenaire'))) {
        resellerPriceKey = h;
      }
      if (!purchasePriceKey && (norm.includes('achat') || norm.includes('cout') || norm.includes('cost') || norm.includes('pa'))) {
        purchasePriceKey = h;
      }
    }

    // Si aucune colonne de nom n'a été reconnue, prendre la première colonne
    if (!nameKey && headers.length > 0) {
      nameKey = headers[0];
    }

    for (const raw of data) {
      // Trouver la valeur du nom
      let rawName = raw[nameKey];
      if (!rawName) {
        // Chercher la première valeur texte non vide dans l'objet
        for (const k of headers) {
          if (raw[k] && typeof raw[k] === 'string' && raw[k].trim().length > 1) {
            rawName = raw[k];
            break;
          }
        }
      }

      const name = String(rawName || '').trim();
      const category_name = String(raw[catKey] || '').trim();
      const legacy_reference = String(raw[refKey] || '').trim();
      const brand = String(raw[brandKey] || '').trim();
      const model_reference = String(raw[modelKey] || '').trim();
      const short_description = String(raw[descKey] || '').trim();

      const parsePrice = (val: any) => {
        if (!val) return undefined;
        const clean = String(val).replace(/[^0-9.,]/g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? undefined : num;
      };

      const detail_price = parsePrice(raw[detailPriceKey]);
      const wholesale_price = parsePrice(raw[wholesalePriceKey]);
      const reseller_price = parsePrice(raw[resellerPriceKey]);
      const purchase_price = parsePrice(raw[purchasePriceKey]);

      if (!name) {
        rows.push({
          name: 'Ligne vide ou sans nom',
          category_name: '',
          isValid: false,
          error: 'Nom du produit introuvable sur cette ligne',
        });
        continue;
      }

      // Vérification doublon
      const dup = catalogService.checkDuplicates(name, legacy_reference);

      rows.push({
        name,
        category_name: category_name || 'Articles divers',
        legacy_reference: legacy_reference || undefined,
        brand: brand || undefined,
        model_reference: model_reference || undefined,
        short_description: short_description || undefined,
        detail_price,
        wholesale_price,
        reseller_price,
        purchase_price,
        isDuplicate: dup.isDuplicate,
        duplicateReason: dup.reason,
        isValid: true,
      });
    }

    setParsedRows(rows);
    setManualNameColumn(nameKey);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportResult(null);
    setParsing(true);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      complete: (results) => {
        const headers = results.meta.fields || [];
        setRawHeaders(headers);
        processCsvData(results.data as any[], headers);
        setParsing(false);
      },
      error: (err) => {
        alert('Erreur lors de la lecture du fichier CSV : ' + err.message);
        setParsing(false);
      }
    });
  };

  // Re-processer si l'utilisateur change la colonne manuelle de nom
  const handleNameColumnChange = (newCol: string) => {
    setManualNameColumn(newCol);
    if (file) {
      setParsing(true);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        encoding: 'UTF-8',
        complete: (results) => {
          processCsvData(results.data as any[], results.meta.fields || [], newCol);
          setParsing(false);
        }
      });
    }
  };

  const handleExecuteImport = async () => {
    if (!file || parsedRows.length === 0) return;
    setImporting(true);

    try {
      // Filtrer les lignes à importer : toutes les valides, ou exclure les doublons si allowDuplicates est faux
      const rowsToImport = parsedRows.filter(r => r.isValid && (allowDuplicates || !r.isDuplicate));

      if (rowsToImport.length === 0) {
        alert('Aucune ligne prête à être importée.');
        setImporting(false);
        return;
      }

      const res = await catalogService.importLegacyBatch(rowsToImport, file.name, userId);
      setImportResult(res);
      if (res.importedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      alert('Erreur lors de l\'importation : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Calculs statistiques
  const totalCount = parsedRows.length;
  const duplicateRows = parsedRows.filter(r => r.isValid && r.isDuplicate);
  const cleanRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  // Nombre de lignes prêtes selon l'option allowDuplicates
  const actionableCount = allowDuplicates
    ? parsedRows.filter(r => r.isValid).length
    : cleanRows.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-modal overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-600" />
              Importation Contrôlée des Anciennes Références
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Intégrez vos références historiques avec détection des doublons et statut automatique « À vérifier ».
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Instructions & Template Download */}
          <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-brand-900 mb-1">
                Règles de sécurité du catalogue V1 :
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Toutes les références importées reçoivent automatiquement le statut <strong>« À vérifier »</strong>.</li>
                <li>Le système génère automatiquement les codes internes GMI manquants.</li>
                <li>Aucune fausse quantité de stock n'est créée.</li>
              </ul>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="btn-secondary text-xs py-2 px-3 whitespace-nowrap gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4 text-brand-600" />
              Télécharger le modèle CSV
            </button>
          </div>

          {/* Upload Area: Masquée ou compacte si un fichier est déjà choisi */}
          {!file && !importResult && (
            <div className="border-2 border-dashed border-brand-300 bg-brand-50/20 rounded-xl p-8 text-center hover:bg-brand-50/40 transition-colors">
              <UploadCloud className="w-12 h-12 text-brand-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Choisissez votre fichier CSV d'anciennes références
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Compatible Excel, point-virgule (;) ou virgule (,), UTF-8
              </p>
              <label className="btn-primary text-xs py-2.5 px-6 cursor-pointer inline-flex gap-2 shadow-md shadow-brand-600/20">
                <FileText className="w-4 h-4" />
                <span>Parcourir mes fichiers...</span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Fichier sélectionné : Encadré compact de statut */}
          {file && !importResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} Ko • {totalCount} ligne(s) détectée(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                  <span>Changer de fichier</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Sélecteur de colonne de nom si ambigu */}
          {rawHeaders.length > 0 && !importResult && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Colonne utilisée pour le Nom :</span>
                <select
                  value={manualNameColumn}
                  onChange={(e) => handleNameColumnChange(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold text-brand-700 focus:outline-none"
                >
                  {rawHeaders.map((h, i) => (
                    <option key={i} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-400">
                {rawHeaders.length} colonne(s) trouvée(s)
              </span>
            </div>
          )}

          {/* Parsing Spinner */}
          {parsing && (
            <div className="py-8 text-center">
              <div className="inline-block w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 mt-2">Analyse du fichier et vérification des données...</p>
            </div>
          )}

          {/* Summary Stats after parsing */}
          {parsedRows.length > 0 && !importResult && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-emerald-700">{cleanRows.length}</span>
                  <p className="text-[11px] font-semibold text-emerald-800">Nouvelles références</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-amber-700">{duplicateRows.length}</span>
                  <p className="text-[11px] font-semibold text-amber-800">Doublons / Similaires</p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-rose-700">{invalidRows.length}</span>
                  <p className="text-[11px] font-semibold text-rose-800">Lignes vides</p>
                </div>
              </div>

              {/* Option tolérante pour les doublons */}
              {duplicateRows.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-900">
                      <strong>{duplicateRows.length} doublon(s)</strong> ont été détectés avec le catalogue actuel.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 font-semibold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplicates}
                      onChange={(e) => setAllowDuplicates(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded"
                    />
                    <span>Importer quand même (statut À vérifier)</span>
                  </label>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 flex justify-between items-center">
                  <span>Prévisualisation des 50 premières lignes :</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {actionableCount} ligne(s) seront importées
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {row.legacy_reference && (
                            <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[11px]">
                              {row.legacy_reference}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 truncate">{row.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Catégorie: <strong>{row.category_name}</strong> {row.brand && `• Marque: ${row.brand}`} {row.detail_price && `• Prix: ${row.detail_price} FCFA`}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {row.isDuplicate ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            allowDuplicates
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500 line-through'
                          }`}>
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Doublon ({row.duplicateReason})
                          </span>
                        ) : row.isValid ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Prêt
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            {row.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Import Result Screen */}
          {importResult && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Importation terminée avec succès !
              </h3>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-emerald-600">{importResult.importedCount}</span>
                  <p className="text-slate-500">Marchandises importées</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-amber-600">{importResult.duplicateCount}</span>
                  <p className="text-slate-500">Doublons traités</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-slate-600">{importResult.skippedCount}</span>
                  <p className="text-slate-500">Ignorés / Vides</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-white p-3.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-36 overflow-y-auto space-y-1">
                  <p className="font-semibold text-slate-800 mb-1">Rapport d'exécution :</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-slate-600">• {err}</p>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="btn-primary text-xs py-2.5 px-6"
              >
                Fermer et consulter le catalogue
              </button>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button onClick={onClose} className="btn-secondary text-xs py-2 px-4">
              Annuler
            </button>

            <div className="flex items-center gap-3">
              {!file && (
                <span className="text-xs text-slate-400">
                  Veuillez sélectionner un fichier CSV
                </span>
              )}
              {file && actionableCount === 0 && (
                <span className="text-xs text-rose-500 font-semibold">
                  Aucune ligne valide à importer
                </span>
              )}
              <button
                onClick={handleExecuteImport}
                disabled={actionableCount === 0 || importing}
                className="btn-primary text-xs py-2.5 px-5 gap-2 shadow-sm"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Importation en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lancer l'importation ({actionableCount} articles)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
