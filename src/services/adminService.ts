import { UserProfile, UserRole, PermissionKey, Category } from '../types';
import { MOCK_USERS, MOCK_CATEGORIES } from '../lib/mockData';
import { isSupabaseConfigured, supabase, createIsolatedAuthClient, ensureFreshSession } from '../lib/supabase';

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
      await ensureFreshSession();
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          permissions:user_permissions(permission_key)
        `)
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

    if (!user && !isSupabaseConfigured) throw new Error('Utilisateur non trouvé');

    // RÈGLE DE SÉCURITÉ CRITIQUE : Empêcher la désactivation du compte principal protégé
    if (user?.is_protected && updates.is_active === false) {
      throw new Error('Sécurité : Le compte de l\'Administrateur Principal protégé ne peut pas être désactivé.');
    }
    if (user?.is_protected && updates.role && updates.role !== 'super_admin') {
      throw new Error('Sécurité : Le rôle de l\'Administrateur Principal ne peut pas être modifié.');
    }

    if (isSupabaseConfigured) {
      await ensureFreshSession();
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
        ...user!,
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
    if (isSupabaseConfigured) {
      await ensureFreshSession();
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
      const users = getLocalUsers();
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('Utilisateur non trouvé');
      user.permissions = permissions;
      const newUsers = users.map(u => u.id === userId ? user : u);
      saveLocalUsers(newUsers);
    }
  },

  // Supprimer définitivement un utilisateur
  async deleteUser(userId: string): Promise<void> {
    const users = getLocalUsers();
    const user = users.find(u => u.id === userId);

    if (user?.is_protected) {
      throw new Error('Sécurité : Le compte de l\'Administrateur Principal protégé ne peut pas être supprimé.');
    }

    if (isSupabaseConfigured) {
      await ensureFreshSession();

      // 1. Tenter la suppression via l'Edge Function pour supprimer également de auth.users (libère l'email)
      try {
        const { data, error } = await supabase.functions.invoke('invite-user', {
          body: { action: 'delete', userId },
        });

        if (!error && data?.success) {
          return;
        }
      } catch (edgeErr) {
        console.warn('Edge function delete non disponible, suppression directe profile:', edgeErr);
      }

      // 2. Supprimer de user_permissions et user_profiles
      await supabase.from('user_permissions').delete().eq('user_id', userId);
      const { error: profileErr } = await supabase.from('user_profiles').delete().eq('id', userId);
      if (profileErr) throw profileErr;
    } else {
      const remainingUsers = users.filter(u => u.id !== userId);
      saveLocalUsers(remainingUsers);
    }
  },

  // Créer / Inviter directement un nouvel utilisateur avec gestion sécurisée de session
  async inviteUser(
    email: string,
    fullName: string,
    role: UserRole,
    initialPermissions: PermissionKey[],
    customPassword?: string
  ): Promise<{ profile: UserProfile; emailSent: boolean; temporaryPassword?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const temporaryPassword = customPassword && customPassword.trim().length >= 6
      ? customPassword.trim()
      : `GMI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}!`;

    if (isSupabaseConfigured) {
      const isFresh = await ensureFreshSession();
      if (!isFresh) {
        throw new Error('Votre session a expiré. Veuillez vous reconnecter pour pouvoir créer un compte collaborateur.');
      }

      // Vérifier si un compte existe déjà dans user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingProfile) {
        throw new Error(`Un collaborateur avec l'adresse ${cleanEmail} existe déjà dans le catalogue.`);
      }

      // 1. Tenter l'envoi de l'invitation par email automatique via Supabase Edge Function (Option B)
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('invite-user', {
          body: {
            email: cleanEmail,
            fullName: cleanFullName,
            role,
            permissions: initialPermissions,
          },
        });

        if (!edgeError && edgeData?.success) {
          const finalProfile: UserProfile = {
            id: edgeData.userId || `user-${Date.now()}`,
            email: cleanEmail,
            full_name: cleanFullName,
            role,
            is_active: true,
            is_protected: false,
            permissions: initialPermissions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return {
            profile: finalProfile,
            emailSent: true,
          };
        }

        if (edgeData?.error && edgeData.error.includes('déjà un compte')) {
          throw new Error(edgeData.error);
        }
      } catch (edgeErr: any) {
        if (edgeErr?.message && edgeErr.message.includes('déjà un compte')) {
          throw edgeErr;
        }
        console.info('Edge function invite-user non déployée ou indisponible, utilisation du mode de secours:', edgeErr?.message);
      }

      // 2. Mode de secours direct : Créer le compte utilisateur dans Supabase auth.users via un client isolé
      // afin de ne pas toucher au jeton de l'administrateur connecté.
      const isolatedAuth = createIsolatedAuthClient();
      const { data: authData, error: authError } = await isolatedAuth.auth.signUp({
        email: cleanEmail,
        password: temporaryPassword,
        options: {
          data: {
            full_name: cleanFullName,
          },
          emailRedirectTo: typeof window !== 'undefined' && window.location.origin.includes('workers.dev')
            ? `${window.location.origin}/`
            : 'https://gmi-catalogue.newton2-0-com.workers.dev/'
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          throw new Error(`Cette adresse email (${cleanEmail}) possède déjà un compte enregistré dans Supabase.`);
        }
        throw new Error(`Erreur lors de la création du compte : ${authError.message}`);
      }

      const newUserId = authData?.user?.id;
      if (!newUserId) {
        throw new Error('Compte créé mais impossible de récupérer l\'identifiant unique.');
      }

      // Attendre brièvement que le trigger SQL on_auth_user_created insère la ligne dans user_profiles
      let createdProfile: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: p } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', newUserId)
          .maybeSingle();
        if (p) {
          createdProfile = p;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      // Mise à jour du rôle et activation immédiate par l'administrateur
      if (createdProfile) {
        const { data: updated, error: updateErr } = await supabase
          .from('user_profiles')
          .update({
            role,
            is_active: true,
            full_name: cleanFullName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', newUserId)
          .select()
          .single();

        if (!updateErr && updated) {
          createdProfile = updated;
        }
      } else {
        // Insertion directe si le trigger n'a pas encore créé la fiche
        const { data: inserted, error: insertErr } = await supabase
          .from('user_profiles')
          .insert({
            id: newUserId,
            email: cleanEmail,
            full_name: cleanFullName,
            role,
            is_active: true,
            is_protected: false,
          })
          .select()
          .single();
        if (!insertErr && inserted) {
          createdProfile = inserted;
        }
      }

      // 2. Attribuer les permissions sélectionnées par l'administrateur
      if (initialPermissions.length > 0) {
        await supabase.from('user_permissions').delete().eq('user_id', newUserId);
        await supabase.from('user_permissions').insert(
          initialPermissions.map(key => ({
            user_id: newUserId,
            permission_key: key,
          }))
        );
      }

      const finalProfile: UserProfile = {
        id: newUserId,
        email: cleanEmail,
        full_name: cleanFullName,
        role,
        is_active: true,
        is_protected: false,
        permissions: initialPermissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        profile: finalProfile,
        emailSent: false,
        temporaryPassword,
      };
    } else {
      // Mode Local / Démo
      const users = getLocalUsers();
      if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
        throw new Error('Un utilisateur avec cette adresse email existe déjà.');
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        full_name: cleanFullName,
        role,
        is_active: true,
        is_protected: false,
        permissions: initialPermissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      saveLocalUsers([...users, newUser]);
      return { profile: newUser, emailSent: false, temporaryPassword };
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
      await ensureFreshSession();
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
      await ensureFreshSession();
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
      await ensureFreshSession();
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } else {
      const cats = getLocalCategories().filter(c => c.id !== id);
      saveLocalCategories(cats);
    }
  }
};
