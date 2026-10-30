import { UserProfile, UserRole, PermissionKey, Category } from '../types';
import { MOCK_USERS, MOCK_CATEGORIES } from '../lib/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const USERS_STORAGE_KEY = 'gmi_catalog_users_v1';
const CATEGORIES_STORAGE_KEY = 'gmi_catalog_categories_v1';

function getLocalUsers(): UserProfile[] {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      //
    }
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_USERS));
  return MOCK_USERS;
}

function saveLocalUsers(users: UserProfile[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getLocalCategories(): Category[] {
  const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      //
    }
  }
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(MOCK_CATEGORIES));
  return MOCK_CATEGORIES;
}

function saveLocalCategories(cats: Category[]): void {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
}

export const adminService = {
  // Liste de tous les utilisateurs
  async getUsers(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, permissions:user_permissions(permission_key)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((u: any) => ({
        ...u,
        permissions: (u.permissions || []).map((p: any) => p.permission_key),
      }));
    }
    return getLocalUsers();
  },

  // Mettre à jour le statut ou le rôle d'un utilisateur
  async updateUserStatus(
    userId: string,
    updates: { is_active?: boolean; role?: UserRole; full_name?: string }
  ): Promise<UserProfile> {
    const users = getLocalUsers();
    const user = users.find(u => u.id === userId);

    if (!user) throw new Error('Utilisateur non trouvé');

    // RÈGLE DE SÉCURITÉ CRITIQUE : Empêcher la désactivation du compte principal protégé
    if (user.is_protected && updates.is_active === false) {
      throw new Error('Sécurité : Le compte de l\'Administrateur Principal protégé ne peut pas être désactivé.');
    }
    if (user.is_protected && updates.role && updates.role !== 'super_admin') {
      throw new Error('Sécurité : Le rôle de l\'Administrateur Principal ne peut pas être modifié.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const updatedUser: UserProfile = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const newUsers = users.map(u => u.id === userId ? updatedUser : u);
      saveLocalUsers(newUsers);
      return updatedUser;
    }
  },

  // Mettre à jour les permissions d'un utilisateur
  async updateUserPermissions(userId: string, permissions: PermissionKey[]): Promise<void> {
    const users = getLocalUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    if (isSupabaseConfigured) {
      // Supprimer les permissions actuelles puis réinsérer
      await supabase.from('user_permissions').delete().eq('user_id', userId);
      if (permissions.length > 0) {
        await supabase.from('user_permissions').insert(
          permissions.map(key => ({
            user_id: userId,
            permission_key: key,
          }))
        );
      }
    } else {
      user.permissions = permissions;
      const newUsers = users.map(u => u.id === userId ? user : u);
      saveLocalUsers(newUsers);
    }
  },

  // Créer / Inviter un nouvel utilisateur
  async inviteUser(email: string, fullName: string, role: UserRole, initialPermissions: PermissionKey[]): Promise<UserProfile> {
    const users = getLocalUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Un utilisateur avec cette adresse email existe déjà.');
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      full_name: fullName.trim(),
      role,
      is_active: true,
      is_protected: false,
      permissions: initialPermissions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      // Dans Supabase, l'invitation se fait idéalement via supabase.auth.admin.inviteUserByEmail côté serveur sécurisé
      // ou en créant la fiche user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          is_active: true,
          is_protected: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      saveLocalUsers([...users, newUser]);
      return newUser;
    }
  },

  // Ajouter une catégorie
  async createCategory(name: string, description?: string): Promise<Category> {
    const cats = getLocalCategories();
    if (cats.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error('Une catégorie portant ce nom existe déjà.');
    }

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description?.trim() || '',
      display_order: cats.length + 1,
      is_active: true,
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('categories').insert(newCat).select().single();
      if (error) throw error;
      return data;
    } else {
      saveLocalCategories([...cats, newCat]);
      return newCat;
    }
  },

  // Mettre à jour une catégorie
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const cats = getLocalCategories();
    const index = cats.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Catégorie introuvable');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const updated = { ...cats[index], ...updates };
      cats[index] = updated;
      saveLocalCategories(cats);
      return updated;
    }
  },

  // Supprimer une catégorie (avec protection contre suppression si des produits y sont associés)
  async deleteCategory(id: string): Promise<void> {
    const productsSaved = localStorage.getItem('gmi_catalog_products_v1');
    if (productsSaved) {
      const products = JSON.parse(productsSaved);
      const isUsed = products.some((p: any) => p.category_id === id);
      if (isUsed) {
        throw new Error('Impossible de supprimer cette catégorie car elle contient des marchandises existantes. Vous pouvez la désactiver à la place.');
      }
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } else {
      const cats = getLocalCategories().filter(c => c.id !== id);
      saveLocalCategories(cats);
    }
  }
};
