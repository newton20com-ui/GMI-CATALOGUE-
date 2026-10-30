import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Package, 
  PlusCircle, 
  UploadCloud, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  UserCheck, 
  Search,
  Layers,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { MOCK_USERS } from '../../lib/mockData';

interface NavbarProps {
  currentTab: 'catalog' | 'admin' | 'archived';
  setCurrentTab: (tab: 'catalog' | 'admin' | 'archived') => void;
  onOpenNewProduct: () => void;
  onOpenImport: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewProduct,
  onOpenImport,
  searchQuery,
  setSearchQuery,
}) => {
  const { currentUser, logout, hasPermission, isSuperAdmin, switchMockUser, isDemoMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const canCreate = hasPermission('product:create');
  const canImport = hasPermission('import:execute');
  const canAdmin = hasPermission('user:manage') || isSuperAdmin();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-subtle backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setCurrentTab('catalog'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-600/20 group-hover:scale-105 transition-transform duration-200">
                <span className="font-bold text-lg tracking-wider">GMI</span>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-base">GMI Catalogue</span>
                  <span className="text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/60 px-1.5 py-0.5 rounded">V1.0</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium tracking-tight">Imprimerie & Sérigraphie • Burkina Faso</p>
              </div>
            </button>
          </div>

          {/* Global Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher référence, nom, marque, mot-clé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-brand-500 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Navigation Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            
            <button
              onClick={() => setCurrentTab('catalog')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                currentTab === 'catalog'
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              Catalogue
            </button>

            {canCreate && (
              <button
                onClick={onOpenNewProduct}
                className="btn-primary text-xs py-2 px-3 gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nouveau Produit</span>
              </button>
            )}

            {canImport && (
              <button
                onClick={onOpenImport}
                className="btn-secondary text-xs py-2 px-3 gap-1.5"
              >
                <UploadCloud className="w-4 h-4 text-slate-600" />
                <span>Import CSV</span>
              </button>
            )}

            {canAdmin && (
              <button
                onClick={() => setCurrentTab('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  currentTab === 'admin'
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Administration
              </button>
            )}
          </div>

          {/* User Profile & Demo Switcher */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <div className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                  {currentUser?.full_name}
                </div>
                <div className="text-[10px] text-brand-600 font-medium">
                  {currentUser?.role === 'super_admin' ? 'Super Admin (Protégé)' : currentUser?.role === 'admin' ? 'Responsable' : 'Employé'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div 
                className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{currentUser?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${currentUser?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="text-[11px] text-slate-600 font-medium capitalize">Rôle : {currentUser?.role}</span>
                  </div>
                </div>

                {/* Fast Role / Demo Switcher */}
                {isDemoMode && switchMockUser && (
                  <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Changer de rôle (Test direct RLS) :</span>
                    </div>
                    <div className="space-y-1">
                      {MOCK_USERS.map((u) => (
                        <button
                          key={u.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            switchMockUser(u.id);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                            currentUser?.id === u.id
                              ? 'bg-brand-100 text-brand-900 font-semibold'
                              : 'hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{u.full_name}</span>
                          <span className="text-[10px] text-slate-500 capitalize">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    onClick={() => logout()}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher article, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500"
            />
          </div>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => { setCurrentTab('catalog'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              currentTab === 'catalog' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Package className="w-5 h-5" />
            Catalogue des marchandises
          </button>

          {canCreate && (
            <button
              onClick={() => { onOpenNewProduct(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <PlusCircle className="w-5 h-5 text-brand-600" />
              Créer une nouvelle marchandise
            </button>
          )}

          {canImport && (
            <button
              onClick={() => { onOpenImport(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UploadCloud className="w-5 h-5 text-slate-600" />
              Importer des références (CSV)
            </button>
          )}

          {canAdmin && (
            <button
              onClick={() => { setCurrentTab('admin'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                currentTab === 'admin' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Administration & Droits
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Connecté: {currentUser?.email}</span>
            <button
              onClick={() => logout()}
              className="text-xs text-rose-600 font-medium hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
