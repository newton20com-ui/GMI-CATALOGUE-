import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, CheckCircle } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export const PwaInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('gmi_pwa_prompt_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('gmi_pwa_prompt_dismissed', 'true');
  };

  // Ne rien afficher si l'application est déjà installée ou si l'utilisateur a fermé la bannière pour cette session
  if (isInstalled || dismissed) {
    return null;
  }

  // Si l'application n'est pas installable via l'API et qu'on n'est pas sur iOS Safari, ne pas afficher la bannière
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Bannière flottante en bas de l'écran */}
      <aside 
        aria-label="Installation de l'application"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur-lg animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
            <Smartphone className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Installer Catalogue GMI</h2>
              <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-400/30 px-1.5 py-0.2 rounded font-medium">PWA</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-snug">
              Accédez directement au catalogue sans navigateur, avec des performances ultra-rapides en magasin et atelier.
            </p>

            <div className="mt-3 flex items-center gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const success = await triggerInstall();
                    if (success) handleDismiss();
                  }}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-brand-400"
                >
                  <Download className="w-3.5 h-3.5" />
                  Installer maintenant
                </button>
              )}

              {isIOS && (
                <button
                  type="button"
                  onClick={() => setShowIosGuide(true)}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-brand-400"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Guide d'installation
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer la bannière"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Modal d'instructions pour iPhone / iPad */}
      {showIosGuide && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowIosGuide(false)}
        >
          <div 
            className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Installer sur iPhone / iPad</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </div>
                <p>
                  Dans <strong>Safari</strong>, touchez le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline text-brand-600" /> dans la barre de navigation.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </div>
                <p>
                  Faites défiler le menu vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </div>
                <p>
                  Touchez <strong>« Ajouter »</strong> en haut à droite. L'icône officielle GMI apparaîtra sur votre écran d'accueil !
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setShowIosGuide(false); handleDismiss(); }}
              className="mt-6 w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
