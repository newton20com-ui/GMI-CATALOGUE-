import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, PermissionKey, Category, Product } from '../../types';
import { SYSTEM_PERMISSIONS, formatDateFr, DEFAULT_ROLE_PERMISSIONS, PRODUCTION_SITE_URL } from '../../lib/constants';
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
  Key,
  Copy,
  RefreshCw,
  MailCheck,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sliders
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

  // Formulaire d'invitation / création
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteMode, setInviteMode] = useState<'email' | 'password'>('email');
  const [invitePermissions, setInvitePermissions] = useState<PermissionKey[]>(DEFAULT_ROLE_PERMISSIONS.staff);
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    email: string;
    password?: string;
    role: string;
    emailSent: boolean;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Suppression d'utilisateur
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Option 2 : Modification du profil utilisateur
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editResetPermissions, setEditResetPermissions] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const generateRandomPassword = () => `GMI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}!`;

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteFullName('');
    setInviteRole('staff');
    setInviteMode('email');
    setInvitePermissions(DEFAULT_ROLE_PERMISSIONS.staff);
    setShowCustomPermissions(false);
    setInvitePassword(generateRandomPassword());
    setInviteModalOpen(true);
  };

  const handleInviteRoleChange = (newRole: UserRole) => {
    setInviteRole(newRole);
    // Ajuster automatiquement les permissions pré-cochées selon le rôle
    if (newRole === 'admin') {
      setInvitePermissions(DEFAULT_ROLE_PERMISSIONS.admin);
    } else {
      setInvitePermissions(DEFAULT_ROLE_PERMISSIONS.staff);
    }
  };

  const handleToggleInvitePermission = (key: PermissionKey) => {
    setInvitePermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleOpenEditModal = (user: UserProfile) => {
    if (user.is_protected) {
      setErrorMsg("Sécurité absolue : Le profil de l'Administrateur Principal protégé ne peut pas être modifié.");
      return;
    }
    setUserToEdit(user);
    setEditFullName(user.full_name);
    setEditRole(user.role === 'super_admin' ? 'admin' : user.role);
    setEditIsActive(user.is_active);
    setEditResetPermissions(false);
    setEditUserModalOpen(true);
  };

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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await adminService.deleteUser(userToDelete.id);
      setSuccessMsg(`L'utilisateur ${userToDelete.full_name} (${userToDelete.email}) a été supprimé définitivement. Son adresse email est de nouveau disponible.`);
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setUserToDelete(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression de l\'utilisateur.');
    } finally {
      setIsDeletingUser(false);
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

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    if (!editFullName.trim()) {
      setErrorMsg('Veuillez renseigner le nom complet du collaborateur.');
      return;
    }

    setIsSavingEdit(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await adminService.updateUserStatus(userToEdit.id, {
        full_name: editFullName.trim(),
        role: editRole,
        is_active: editIsActive,
      });

      let finalPerms: PermissionKey[] = (userToEdit.permissions as PermissionKey[]) || [];
      if (editResetPermissions) {
        finalPerms = DEFAULT_ROLE_PERMISSIONS[editRole as 'staff' | 'admin'] || ['catalog:view'];
        await adminService.updateUserPermissions(userToEdit.id, finalPerms);
      }

      setSuccessMsg(`Profil de ${editFullName.trim()} mis à jour avec succès.`);
      setEditUserModalOpen(false);
      setUserToEdit(null);

      if (selectedUser?.id === userToEdit.id) {
        setSelectedUser({
          ...selectedUser,
          ...updated,
          full_name: editFullName.trim(),
          role: editRole,
          is_active: editIsActive,
          permissions: finalPerms,
        });
      }
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setInviteLoading(true);

    try {
      const perms = invitePermissions.length > 0 
        ? invitePermissions 
        : (DEFAULT_ROLE_PERMISSIONS[inviteRole as 'staff' | 'admin'] || ['catalog:view']);

      const pwd = invitePassword.trim() || generateRandomPassword();
      const res = await adminService.inviteUser(
        inviteEmail, 
        inviteFullName, 
        inviteRole, 
        perms, 
        pwd,
        inviteMode
      );

      setCreatedCredentials({
        fullName: inviteFullName,
        email: inviteEmail.trim().toLowerCase(),
        password: res.temporaryPassword,
        role: inviteRole,
        emailSent: Boolean(res.emailSent),
      });

      if (res.emailSent) {
        setSuccessMsg(`Email officiel d'invitation avec lien sécurisé envoyé à ${inviteFullName} (${inviteEmail}).`);
      } else {
        setSuccessMsg(`Compte créé avec succès pour ${inviteFullName} (${inviteEmail}).`);
      }
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteFullName('');
      setInvitePassword('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setInviteLoading(false);
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

  const handleDeleteProductPermanently = async (id: string, name: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    const confirmVal = window.prompt(`Supprimer définitivement "${name}" ?\nTous les tarifs et photos associés seront effacés.\n\nTapez SUPPRIMER pour confirmer :`);
    if (confirmVal !== 'SUPPRIMER') return;

    try {
      await catalogService.deleteProductPermanently(id);
      setSuccessMsg(`"${name}" supprimé définitivement.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression.');
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
            onClick={handleOpenInviteModal}
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

                    <div className="flex items-center gap-1.5">
                      {!u.is_protected && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(u);
                            }}
                            className="p-1.5 rounded text-xs text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Modifier ce profil"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUserActive(u);
                            }}
                            className={`p-1.5 rounded text-xs transition-colors ${
                              u.is_active
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.is_active ? 'Désactiver ce compte' : 'Activer ce compte'}
                          >
                            {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserToDelete(u);
                            }}
                            className="p-1.5 rounded text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer définitivement cet utilisateur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
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
                <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Permissions individuelles : {selectedUser.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedUser.email}</p>
                  </div>
                  {selectedUser.is_protected ? (
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                      Accès total inaltérable
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(selectedUser)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 flex items-center gap-1.5 transition-colors"
                        title="Modifier le nom, rôle ou statut de ce collaborateur"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Modifier le profil</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(selectedUser)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 flex items-center gap-1.5 transition-colors"
                        title="Supprimer définitivement cet utilisateur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
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
                        title="Restaurer dans le catalogue actif"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurer
                      </button>
                      <button
                        onClick={() => handleDeleteProductPermanently(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Supprimer définitivement cet article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1 : INVITER / CRÉER UN COLLABORATEUR (ENRICHI) */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-modal border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Ajouter un collaborateur</h3>
                  <p className="text-[11px] text-slate-500">Invitation par email ou création directe avec accès immédiat</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setInviteModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleInviteSubmit} className="p-6 overflow-y-auto space-y-4">
              
              {/* Choix du mode d'invitation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Méthode d'intégration <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInviteMode('email')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      inviteMode === 'email'
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Mail className={`w-3.5 h-3.5 ${inviteMode === 'email' ? 'text-brand-600' : 'text-slate-400'}`} />
                        Email officiel
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Envoie un lien d'accès sécurisé par email. Le collaborateur choisit son mot de passe.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteMode('password')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      inviteMode === 'password'
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Key className={`w-3.5 h-3.5 ${inviteMode === 'password' ? 'text-brand-600' : 'text-slate-400'}`} />
                        Mot de passe direct
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        Terrain
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Création immédiate sans email. Mot de passe à transmettre manuellement (WhatsApp/SMS).
                    </p>
                  </button>
                </div>
              </div>

              {/* Indicateur Destination de Production (URL Réelle Supabase) */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                  <ExternalLink className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  <span className="font-medium">URL de destination officielle :</span>
                  <code className="font-mono text-brand-700 truncate font-semibold">{PRODUCTION_SITE_URL}</code>
                </div>
              </div>

              {/* Nom & Prénom */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et prénom du collaborateur <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Traoré Fatou"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              {/* Adresse Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse email professionnelle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="fatou@gmi.bf"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rôle fonctionnel
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => handleInviteRoleChange(e.target.value as UserRole)}
                  className="input-field text-xs"
                >
                  <option value="staff">Employé standard (consultation du catalogue et prix de détail)</option>
                  <option value="admin">Responsable / Administrateur commercial (gestion complète et tarifs gros/revendeur)</option>
                </select>
              </div>

              {/* Mot de passe (si mode direct) */}
              {inviteMode === 'password' && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-amber-900">
                      Mot de passe temporaire initial <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setInvitePassword(generateRandomPassword())}
                      className="text-[11px] text-brand-700 hover:text-brand-800 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-amber-300"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Générer
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: GMI-2026-8921!"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="input-field text-xs pl-9 font-mono bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Ce mot de passe permettra une connexion immédiate dès validation du formulaire.
                  </p>
                </div>
              )}

              {/* Accordéon Personnalisation des Permissions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCustomPermissions(!showCustomPermissions)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-brand-600" />
                    <span>Habilitations accordées ({invitePermissions.length} active{invitePermissions.length > 1 ? 's' : ''})</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-brand-600 font-medium">
                    <span>{showCustomPermissions ? 'Masquer' : 'Personnaliser'}</span>
                    {showCustomPermissions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {showCustomPermissions && (
                  <div className="p-3 bg-white space-y-2.5 max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between pb-1.5 text-[11px]">
                      <span className="text-slate-500">Cochez les droits attribués :</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (invitePermissions.length === SYSTEM_PERMISSIONS.length) {
                            setInvitePermissions(DEFAULT_ROLE_PERMISSIONS[inviteRole as 'staff' | 'admin'] || ['catalog:view']);
                          } else {
                            setInvitePermissions(SYSTEM_PERMISSIONS.map(p => p.key));
                          }
                        }}
                        className="text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {invitePermissions.length === SYSTEM_PERMISSIONS.length ? 'Réinitialiser' : 'Tout cocher'}
                      </button>
                    </div>
                    {SYSTEM_PERMISSIONS.map((p) => {
                      const isChecked = invitePermissions.includes(p.key);
                      return (
                        <label key={p.key} className="pt-2 flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleInvitePermission(p.key)}
                            className="mt-0.5 w-3.5 h-3.5 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block text-[11px]">{p.label}</span>
                            <span className="text-slate-500 text-[10px] leading-tight block">{p.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3"
                  disabled={inviteLoading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={inviteLoading}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {inviteLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>
                    {inviteLoading
                      ? (inviteMode === 'email' ? 'Envoi en cours...' : 'Création en cours...')
                      : (inviteMode === 'email' ? 'Envoyer l\'invitation par email' : 'Créer et activer le compte')
                    }
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : OPTION 2 — MODIFIER LE PROFIL COLLABORATEUR */}
      {editUserModalOpen && userToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-modal border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Modifier le profil collaborateur</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{userToEdit.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et prénom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Traoré Fatou"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rôle dans le catalogue
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="input-field text-xs"
                >
                  <option value="staff">Employé standard (consultation catalogue)</option>
                  <option value="admin">Responsable / Administrateur commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statut du compte
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                      editIsActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Actif</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                      !editIsActive
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Désactivé</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editResetPermissions}
                    onChange={(e) => setEditResetPermissions(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">
                      Appliquer les permissions standard du rôle {editRole === 'admin' ? 'Responsable' : 'Employé'}
                    </span>
                    <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">
                      {editRole === 'admin'
                        ? 'Accorde la consultation, modification, gestion des photos, tarifs gros/revendeur et imports.'
                        : 'Accorde uniquement la consultation standard du catalogue.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUserModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3"
                  disabled={isSavingEdit}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                >
                  {isSavingEdit && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isSavingEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation : Email envoyé OU Identifiants générés */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-modal border border-slate-200 animate-in fade-in zoom-in-95">
            {createdCredentials.emailSent ? (
              // Cas 1 : Email officiel envoyé automatiquement
              <>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <MailCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Invitation envoyée par email !</h3>
                    <p className="text-xs text-slate-500">Un lien cliquable a été envoyé au collaborateur</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Destinataire :</span>
                    <span className="ml-2 font-semibold text-slate-800">{createdCredentials.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Adresse email :</span>
                    <span className="ml-2 font-semibold text-slate-800 font-mono">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Rôle attribué :</span>
                    <span className="ml-2 font-semibold text-slate-800 capitalize">{createdCredentials.role === 'admin' ? 'Responsable' : 'Employé Standard'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                    <p className="leading-relaxed">
                      Le collaborateur recevra un email officiel GMI. Il lui suffira de <strong>cliquer sur le bouton d'invitation</strong> pour activer son compte et choisir son propre mot de passe.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // Cas 2 : Mode de secours avec identifiants et mot de passe provisoire
              <>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Compte créé avec succès</h3>
                    <p className="text-xs text-slate-500">Transmettez ces identifiants au collaborateur</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Nom complet :</span>
                    <span className="ml-2 font-semibold text-slate-800">{createdCredentials.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Identifiant (Email) :</span>
                    <span className="ml-2 font-semibold text-slate-800 font-mono">{createdCredentials.email}</span>
                  </div>
                  {createdCredentials.password && (
                    <div>
                      <span className="text-slate-500 font-medium">Mot de passe temporaire :</span>
                      <div className="mt-1 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                        <span className="font-mono font-bold text-brand-700 tracking-wide text-sm">{createdCredentials.password}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}`);
                            setCopiedPass(true);
                            setTimeout(() => setCopiedPass(false), 2500);
                          }}
                          className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-md transition-colors"
                        >
                          {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPass ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 font-medium">Rôle attribué :</span>
                    <span className="ml-2 font-semibold text-slate-800 capitalize">{createdCredentials.role === 'admin' ? 'Responsable' : 'Employé Standard'}</span>
                  </div>
                </div>
              </>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full btn-primary py-2 text-xs font-semibold"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation de suppression définitive d'un utilisateur */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-modal border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supprimer définitivement l'utilisateur ?</h3>
                <p className="text-xs text-slate-500">Cette action est irréversible</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 mb-5">
              <p>
                Êtes-vous certain de vouloir supprimer le compte de <strong>{userToDelete.full_name}</strong> (<code className="font-mono">{userToDelete.email}</code>) ?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                Son compte et tous ses accès seront révoqués. Son adresse email sera <strong>immédiatement libérée</strong> et vous pourrez le réinviter proprement avec le nouveau système d'invitation par email si vous le souhaitez.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="btn-secondary text-xs py-2 px-3"
                disabled={isDeletingUser}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {isDeletingUser && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{isDeletingUser ? 'Suppression en cours...' : 'Confirmer la suppression'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
