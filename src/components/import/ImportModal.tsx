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
  RefreshCw
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
  statusText?: string;
  isDuplicate?: boolean;
  isValid: boolean;
  error?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess, userId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportResult(null);
    setParsing(true);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rows: ParsedRow[] = [];

        for (const raw of results.data as any[]) {
          // Extraction tolérante des colonnes courantes
          const name = raw['nom_produit'] || raw['Nom'] || raw['nom'] || raw['Designation'] || raw['designation'] || '';
          const category_name = raw['categorie'] || raw['Catégorie'] || raw['famille'] || raw['Famille'] || '';
          const legacy_reference = raw['ancienne_reference'] || raw['Ref'] || raw['reference'] || raw['Reference'] || '';
          const brand = raw['marque'] || raw['Marque'] || '';
          const model_reference = raw['modele'] || raw['Modèle'] || '';
          const short_description = raw['description_courte'] || raw['description'] || '';

          const detail_price = parseFloat(raw['prix_detail'] || raw['Prix détail'] || raw['detail'] || '') || undefined;
          const wholesale_price = parseFloat(raw['prix_gros'] || raw['Prix gros'] || raw['gros'] || '') || undefined;
          const reseller_price = parseFloat(raw['prix_revendeur'] || raw['revendeur'] || '') || undefined;
          const purchase_price = parseFloat(raw['prix_achat'] || raw['achat'] || '') || undefined;

          if (!name.trim()) {
            rows.push({
              name: 'Inconnue',
              category_name,
              isValid: false,
              error: 'Nom du produit manquant',
            });
            continue;
          }

          // Détection doublon
          const dup = catalogService.checkDuplicates(name, legacy_reference);

          rows.push({
            name: name.trim(),
            category_name: category_name.trim() || 'Articles divers',
            legacy_reference: legacy_reference.trim() || undefined,
            brand: brand.trim() || undefined,
            model_reference: model_reference.trim() || undefined,
            short_description: short_description.trim() || undefined,
            detail_price,
            wholesale_price,
            reseller_price,
            purchase_price,
            isDuplicate: dup.isDuplicate,
            isValid: !dup.isDuplicate,
            error: dup.isDuplicate ? dup.reason : undefined,
          });
        }

        setParsedRows(rows);
        setParsing(false);
      },
      error: (err) => {
        alert('Erreur lors de la lecture du fichier CSV : ' + err.message);
        setParsing(false);
      }
    });
  };

  const handleExecuteImport = async () => {
    if (!file || parsedRows.length === 0) return;
    setImporting(true);

    try {
      const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
      const res = await catalogService.importLegacyBatch(validRows, file.name, userId);
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

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;
  const invalidCount = parsedRows.filter(r => !r.isValid && !r.isDuplicate).length;

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
              Intégrez progressivement vos références historiques avec détection automatique des doublons.
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
                Règles de sécurité et d'intégrité :
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Toutes les références importées reçoivent automatiquement le statut <strong>« À vérifier »</strong>.</li>
                <li>Les doublons détectés (même référence ancienne ou même nom) sont immédiatement signalés et écartés.</li>
                <li>Aucune quantité de stock historique n'est importée dans cette V1.</li>
              </ul>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="btn-secondary text-xs py-2 px-3 whitespace-nowrap gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4 text-brand-600" />
              Modèle CSV d'exemple
            </button>
          </div>

          {/* Upload Area */}
          {!importResult && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Sélectionnez votre fichier CSV
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Délimiteur point-virgule (;) ou virgule (,), encodage UTF-8
              </p>
              <label className="btn-primary text-xs py-2 px-5 cursor-pointer inline-flex gap-2">
                <FileText className="w-4 h-4" />
                <span>Parcourir mes fichiers...</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Parsing Spinner */}
          {parsing && (
            <div className="py-10 text-center">
              <div className="inline-block w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 mt-2">Analyse du fichier et vérification des doublons...</p>
            </div>
          )}

          {/* Summary Stats after parsing */}
          {parsedRows.length > 0 && !importResult && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-emerald-700">{validCount}</span>
                  <p className="text-[11px] font-semibold text-emerald-800">Lignes prêtes</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-amber-700">{duplicateCount}</span>
                  <p className="text-[11px] font-semibold text-amber-800">Doublons écartés</p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-xl font-bold text-rose-700">{invalidCount}</span>
                  <p className="text-[11px] font-semibold text-rose-800">Invalides</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 flex justify-between">
                  <span>Prévisualisation des données ({parsedRows.length} lignes)</span>
                  <span className="text-[11px] text-slate-500">{file?.name}</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {parsedRows.slice(0, 50).map((row, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
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
                          Catégorie: {row.category_name} {row.brand && `• Marque: ${row.brand}`}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {row.isDuplicate ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Doublon
                          </span>
                        ) : row.isValid ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Valide
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
                Rapport d'importation terminé
              </h3>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-emerald-600">{importResult.importedCount}</span>
                  <p className="text-slate-500">Marchandises ajoutées</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-amber-600">{importResult.duplicateCount}</span>
                  <p className="text-slate-500">Doublons ignorés</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-lg font-bold text-slate-600">{importResult.skippedCount}</span>
                  <p className="text-slate-500">Ignorés / Erreurs</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left bg-white p-3.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-36 overflow-y-auto space-y-1">
                  <p className="font-semibold text-slate-800 mb-1">Détails des notifications :</p>
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
            <button
              onClick={handleExecuteImport}
              disabled={validCount === 0 || importing}
              className="btn-primary text-xs py-2 px-5 gap-2"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Importer {validCount} marchandise(s)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
