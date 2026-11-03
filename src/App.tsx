import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { PwaInstallBanner } from './components/layout/PwaInstallBanner';
import { CatalogView } from './components/catalog/CatalogView';
import { ProductDetailModal } from './components/catalog/ProductDetailModal';
import { ProductFormModal } from './components/catalog/ProductFormModal';
import { ImportModal } from './components/import/ImportModal';
import { AdminView } from './components/admin/AdminView';
import { LoginView } from './components/auth/LoginView';
import { PasswordModal } from './components/auth/PasswordModal';
import { Product, Category, ProductStatus } from './types';
import { catalogService } from './services/catalogService';

const MainApplication: React.FC = () => {
  const { currentUser, loading: authLoading, hasPermission, isSuperAdmin, isInviteSession, clearInviteSession } = useAuth();

  // Navigation
  const [currentTab, setCurrentTab] = useState<'catalog' | 'admin' | 'archived'>('catalog');

  // Filtres catalogue
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');

  // Données
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Synchronisation de l'URL avec le produit sélectionné
  const handleSelectProduct = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (product) {
      const code = product.internal_code || product.id;
      if (url.searchParams.get('product') !== code) {
        url.searchParams.set('product', code);
        url.searchParams.delete('p');
        window.history.pushState({ productId: product.id, code }, '', url.toString());
      }
    } else {
      if (url.searchParams.has('product') || url.searchParams.has('p')) {
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
        window.history.pushState({}, '', cleanUrl);
      }
    }
  }, []);

  // Ouvrir un produit par ID ou code interne (support Deep Linking)
  const openProductByCodeOrId = useCallback(async (codeOrId: string) => {
    if (!codeOrId) return;
    const trimmed = codeOrId.trim();
    // 1. Chercher dans les produits déjà en mémoire
    const localMatch = products.find(p => 
      p.id === trimmed || 
      p.id.toLowerCase() === trimmed.toLowerCase() || 
      p.internal_code?.toLowerCase() === trimmed.toLowerCase() ||
      p.legacy_reference?.toLowerCase() === trimmed.toLowerCase()
    );
    if (localMatch) {
      handleSelectProduct(localMatch);
      return;
    }

    // 2. Sinon, interroger le service (Supabase ou mock)
    try {
      const fetched = await catalogService.getProductById(trimmed, hasPermission, isSuperAdmin());
      if (fetched) {
        handleSelectProduct(fetched);
      }
    } catch (err) {
      console.error('Erreur ouverture produit direct:', err);
    }
  }, [products, hasPermission, isSuperAdmin, handleSelectProduct]);

  // Détection initiale des paramètres d'URL (?product=... ou ?p=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const deepProduct = params.get('product') || params.get('p');
    if (deepProduct) {
      sessionStorage.setItem('gmi_target_product', deepProduct);
    }
  }, []);

  // Résolution automatique du lien direct une fois authentifié
  useEffect(() => {
    if (!currentUser) return;
    const pendingTarget = sessionStorage.getItem('gmi_target_product');
    if (pendingTarget) {
      openProductByCodeOrId(pendingTarget);
      sessionStorage.removeItem('gmi_target_product');
    } else {
      const params = new URLSearchParams(window.location.search);
      const deepProduct = params.get('product') || params.get('p');
      if (deepProduct && (!selectedProduct || (selectedProduct.id !== deepProduct && selectedProduct.internal_code !== deepProduct))) {
        openProductByCodeOrId(deepProduct);
      }
    }
  }, [currentUser, openProductByCodeOrId, selectedProduct]);

  // Support natif PWA Launch Queue (ouverture de liens par l'application installée sur mobile/desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('launchQueue' in window && typeof (window as any).launchQueue?.setConsumer === 'function') {
      (window as any).launchQueue.setConsumer((launchParams: any) => {
        if (!launchParams?.targetURL) return;
        try {
          const targetUrl = new URL(launchParams.targetURL);
          const codeOrId = targetUrl.searchParams.get('product') || targetUrl.searchParams.get('p');
          if (codeOrId) {
            if (currentUser) {
              openProductByCodeOrId(codeOrId);
            } else {
              sessionStorage.setItem('gmi_target_product', codeOrId);
            }
          }
        } catch (err) {
          console.error('Erreur launchQueue PWA:', err);
        }
      });
    }
  }, [currentUser, openProductByCodeOrId]);

  // Gestion du bouton Précédent / Suivant du navigateur et gestes mobiles Android
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const prodParam = params.get('product') || params.get('p');
      if (!prodParam) {
        setSelectedProduct(null);
      } else {
        openProductByCodeOrId(prodParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [openProductByCodeOrId]);

  // Chargement des données
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoadingProducts(true);
    try {
      const [cats, prods] = await Promise.all([
        catalogService.getCategories(),
        catalogService.getProducts({
          categoryId: selectedCategory,
          search: searchQuery,
          status: statusFilter,
          hasPermission,
          isSuperAdmin: isSuperAdmin(),
        }),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Erreur chargement catalogue:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [currentUser, selectedCategory, searchQuery, statusFilter, hasPermission, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wider">Chargement sécurisé du catalogue GMI...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  const canCreate = hasPermission('product:create');
  const canImport = hasPermission('import:execute');
  const canEditPrices = isSuperAdmin() || hasPermission('price:edit:detail');

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setFormModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    handleSelectProduct(null);
    setProductToEdit(product);
    setFormModalOpen(true);
  };

  const handleProductSaved = async (savedProduct: Product) => {
    setFormModalOpen(false);
    setProductToEdit(null);
    await loadData();
    // Toujours recharger le produit pour que la fiche détaillée affiche immédiatement toutes les photographies
    const fresh = await catalogService.getProductById(
      savedProduct.id,
      hasPermission,
      isSuperAdmin()
    );
    handleSelectProduct(fresh || savedProduct);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewProduct={handleOpenNewProduct}
        onOpenImport={() => setImportModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* PWA Install Notification Banner */}
      <PwaInstallBanner />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'catalog' && (
          <CatalogView
            products={products}
            categories={categories}
            loading={loadingProducts}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelectProduct={handleSelectProduct}
            onOpenNewProduct={handleOpenNewProduct}
            onOpenImport={() => setImportModalOpen(true)}
            canCreate={canCreate}
            canImport={canImport}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView
            currentUser={currentUser}
            onSelectProduct={handleSelectProduct}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => handleSelectProduct(null)}
          onEdit={handleOpenEditProduct}
          onRefresh={async () => {
            loadData();
            if (selectedProduct) {
              const refreshed = await catalogService.getProductById(
                selectedProduct.id,
                hasPermission,
                isSuperAdmin()
              );
              if (refreshed) handleSelectProduct(refreshed);
            }
          }}
          hasPermission={hasPermission}
          isSuperAdmin={isSuperAdmin()}
          currentUser={currentUser}
        />
      )}

      {/* Product Add / Edit Modal */}
      {formModalOpen && (
        <ProductFormModal
          productToEdit={productToEdit}
          categories={categories}
          onClose={() => { setFormModalOpen(false); setProductToEdit(null); }}
          onSuccess={handleProductSaved}
          userId={currentUser.id}
          canEditPrices={canEditPrices}
        />
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <ImportModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => { loadData(); }}
          userId={currentUser.id}
        />
      )}

      {/* Modale d'accueil pour premier mot de passe (Arrivée via invitation par email) */}
      {isInviteSession && (
        <PasswordModal
          isOpen={isInviteSession}
          onClose={clearInviteSession}
          isInitialSetup={true}
        />
      )}

      {/* Corporate Professional Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">GMI</span>
            <span>— Général Matériel d'Imprimerie et de Sérigraphie</span>
            <span className="hidden md:inline">• Ouagadougou, Burkina Faso</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Catalogue Interne V1.0</span>
            <span>•</span>
            <span>Monnaie : FCFA (XOF)</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">Sécurité RLS active</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
