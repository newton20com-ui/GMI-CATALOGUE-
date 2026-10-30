import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { CatalogView } from './components/catalog/CatalogView';
import { ProductDetailModal } from './components/catalog/ProductDetailModal';
import { ProductFormModal } from './components/catalog/ProductFormModal';
import { ImportModal } from './components/import/ImportModal';
import { AdminView } from './components/admin/AdminView';
import { LoginView } from './components/auth/LoginView';
import { Product, Category, ProductStatus } from './types';
import { catalogService } from './services/catalogService';

const MainApplication: React.FC = () => {
  const { currentUser, loading: authLoading, hasPermission, isSuperAdmin } = useAuth();

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
    setSelectedProduct(null);
    setProductToEdit(product);
    setFormModalOpen(true);
  };

  const handleProductSaved = (savedProduct: Product) => {
    setFormModalOpen(false);
    setProductToEdit(null);
    loadData();
    setSelectedProduct(savedProduct);
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
            onSelectProduct={(p) => setSelectedProduct(p)}
            onOpenNewProduct={handleOpenNewProduct}
            onOpenImport={() => setImportModalOpen(true)}
            canCreate={canCreate}
            canImport={canImport}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView
            currentUser={currentUser}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={handleOpenEditProduct}
          onRefresh={async () => {
            loadData();
            if (selectedProduct) {
              const refreshed = await catalogService.getProductById(
                selectedProduct.id,
                hasPermission,
                isSuperAdmin()
              );
              if (refreshed) setSelectedProduct(refreshed);
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
