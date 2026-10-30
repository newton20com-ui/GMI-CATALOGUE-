import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, PermissionKey, Category, Product } from '../../types';
import { SYSTEM_PERMISSIONS, formatDateFr } from '../../lib/constants';
import { adminService } from '../../services/adminService';
import { catalogService } from '../../services/catalogService';
import { 
  Users, 
  Shield, 
  Layers, 
  Archive, 
  UserPlus, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Edit2, 
  Trash2, 
  Plus, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface AdminViewProps {
  onSelectProduct: (product: Product) => void;
  currentUser: UserProfile;
}

export const AdminView: React.FC<AdminViewProps> = ({ onSelectProduct, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'archives'>('users');
  
  // State Utilisateurs
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  // State Catégories
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // State Archives
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);

  // Feedback UI
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Invitation Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');

  const isSuperAdmin = currentUser.role === 'super_admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, cList, archList] = await Promise.all([
        adminService.getUsers(),
        catalogService.getCategories(),
        catalogService.getProducts({
          status: 'archive',
          hasPermission: () => true,
          isSuperAdmin: true,
        })
      ]);
      setUsers(uList);
      setCategories(cList);
      setArchivedProducts(archList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du chargement des données administratives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserActive = async (user: UserProfile) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (user.is_protected) {
      setErrorMsg('Sécurité absolue : Le compte de l\'Administrateur Principal protégé ne peut pas être désactivé.');
      return;
    }

    try {
      await adminService.updateUserStatus(user.id, { is_active: !user.is_active });
      setSuccessMsg(`Statut de ${user.full_name} modifié avec succès.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la modification.');
    }
  };

  const handleTogglePermission = async (user: UserProfile, permKey: PermissionKey) => {
    setErrorMsg('');
    setSuccessMsg('');
    const currentPerms = user.permissions || [];
    const hasPerm = currentPerms.includes(permKey);
    const newPerms = hasPerm
      ? currentPerms.filter(p => p !== permKey)
      : [...currentPerms, permKey];

    try {
      await adminService.updateUserPermissions(user.id, newPerms as PermissionKey[]);
      setSuccessMsg('Permissions mises à jour.');
      const updatedUser = { ...user, permissions: newPerms };
      setSelectedUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour des permissions.');
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const defaultPerms: PermissionKey[] = ['catalog:view'];
      if (inviteRole === 'admin') {
        defaultPerms.push('product:create', 'product:edit', 'photo:manage', 'price:view:gros', 'price:view:revendeur', 'import:execute');
      }

      await adminService.inviteUser(inviteEmail, inviteFullName, inviteRole, defaultPerms);
      setSuccessMsg(`Compte créé avec succès pour ${inviteFullName} (${inviteEmail}).`);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteFullName('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création du compte.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await adminService.createCategory(newCatName.trim(), newCatDesc.trim());
      setSuccessMsg(`Catégorie "${newCatName.trim()}" ajoutée avec succès.`);
      setNewCatName('');
      setNewCatDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'ajout de la catégorie.');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!window.confirm(`Confirmez-vous la suppression de la catégorie "${cat.name}" ?`)) return;

    try {
      await adminService.deleteCategory(cat.id);
      setSuccessMsg(`Catégorie "${cat.name}" supprimée.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleRestoreProduct = async (id: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await catalogService.restoreProduct(id);
      setSuccessMsg('Marchandise restaurée avec succès dans le catalogue actif.');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la restauration.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            Administration & Contrôle des Accès
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion des utilisateurs, des habilitations tarifaires et organisation des catégories.
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-primary text-xs py-2 px-4 gap-2 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold mb-6">
        <button
          onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Comptes & Permissions ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Catégories de Marchandises ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('archives')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'archives'
              ? 'border-b-2 border-brand-600 text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="w-4 h-4" />
          Marchandises Archivées ({archivedProducts.length})
        </button>
      </div>

      {/* TAB 1: USERS & PERMISSIONS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Users List (Left Column) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Liste des employés & accès
            </h3>

            <div className="card-container divide-y divide-slate-100">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-brand-50/80 border-l-4 border-l-brand-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {u.full_name}
                        </span>
                        {u.is_protected && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            Protégé
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className={`inline-block w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-slate-600 font-medium capitalize">
                          {u.is_active ? 'Actif' : 'Désactivé'} • Rôle : {u.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!u.is_protected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUserActive(u);
                          }}
                          className={`p-1.5 rounded text-xs ${
                            u.is_active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.is_active ? 'Désactiver ce compte' : 'Activer ce compte'}
                        >
                          {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix (Right Column) */}
          <div className="lg:col-span-7">
            {selectedUser ? (
              <div className="card-container p-5">
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Permissions individuelles : {selectedUser.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedUser.email}</p>
                  </div>
                  {selectedUser.is_protected && (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                      Accès total inaltérable
                    </span>
                  )}
                </div>

                {selectedUser.role === 'super_admin' ? (
                  <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl text-purple-900 text-xs">
                    <p className="font-bold mb-1">Administrateur Principal Protégé :</p>
                    <p className="leading-relaxed">
                      Ce profil possède automatiquement toutes les autorisations du système (création, modification, archivage, accès aux prix d'achat/gros/revendeur confidentiels, gestion des utilisateurs et imports). Il est garanti contre la désactivation accidentelle.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Groups of permissions */}
                    {['Catalogue', 'Produits', 'Photographies', 'Tarifs', 'Administration'].map((categoryName) => {
                      const perms = SYSTEM_PERMISSIONS.filter(p => p.category === categoryName);
                      return (
                        <div key={categoryName} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                            {categoryName}
                          </h4>
                          <div className="space-y-2">
                            {perms.map((p) => {
                              const isChecked = selectedUser.permissions?.includes(p.key) || false;
                              return (
                                <label
                                  key={p.key}
                                  className="flex items-start gap-3 p-2 bg-white rounded-lg border border-slate-200/80 hover:border-brand-400 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(selectedUser, p.key)}
                                    className="mt-0.5 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                                  />
                                  <div className="text-xs">
                                    <span className="font-semibold text-slate-800 block">
                                      {p.label}
                                    </span>
                                    <span className="text-slate-500 text-[11px] leading-tight block">
                                      {p.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-container p-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto stroke-1 mb-2" />
                <p className="text-xs font-medium">Sélectionnez un employé dans la liste pour ajuster ses permissions.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Add Category Form */}
          <div className="md:col-span-5">
            <div className="card-container p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                Ajouter une nouvelle catégorie
              </h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de la catégorie <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Imprimerie — Équipements de finition"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description facultative
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Préciser les marchandises concernées..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <button type="submit" className="w-full btn-primary text-xs py-2">
                  Enregistrer la catégorie
                </button>
              </form>
            </div>
          </div>

          {/* Existing Categories Table */}
          <div className="md:col-span-7">
            <div className="card-container divide-y divide-slate-100">
              <div className="p-3.5 bg-slate-50 font-bold text-xs text-slate-700 flex justify-between">
                <span>Catégories configurées ({categories.length})</span>
                <span className="text-[11px] text-slate-500">Ordre d'affichage</span>
              </div>
              {categories.map((cat, idx) => (
                <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">#{idx + 1}</span>
                      <span className="font-bold text-slate-900">{cat.name}</span>
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Supprimer la catégorie (protégée si des marchandises existent)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: ARCHIVES */}
      {activeTab === 'archives' && (
        <div className="card-container p-6">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Marchandises Archivées
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Articles retirés de la commercialisation courante. L'historique et les codes sont conservés.
            </p>
          </div>

          {archivedProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Archive className="w-10 h-10 mx-auto stroke-1 mb-2" />
              <p className="text-xs font-medium">Aucune marchandise archivée pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {archivedProducts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.internal_code}
                      </span>
                      <span className="font-semibold text-slate-900">{p.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.category?.name} • Dernière modif: {formatDateFr(p.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProduct(p)}
                      className="btn-secondary text-[11px] py-1.5 px-3"
                    >
                      Voir la fiche
                    </button>
                    <button
                      onClick={() => handleRestoreProduct(p.id)}
                      className="btn-primary text-[11px] py-1.5 px-3 gap-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-modal border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" />
                Inviter un nouvel employé
              </h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et prénom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ouedraogo Moussa"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse email professionnelle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="moussa@gmi.bf"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rôle initial
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="input-field text-xs"
                >
                  <option value="staff">Employé standard (consultation catalogue)</option>
                  <option value="admin">Responsable / Administrateur commercial</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  Créer et envoyer les accès
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
