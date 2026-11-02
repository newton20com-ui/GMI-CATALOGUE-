import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, PermissionKey } from '../types';
import { MOCK_USERS } from '../lib/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { PRODUCTION_SITE_URL } from '../lib/constants';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; isFirstAdmin?: boolean }>;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  isSuperAdmin: () => boolean;
  switchMockUser?: (userId: string) => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'gmi_catalog_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !isSupabaseConfigured;

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*, user_permissions(permission_key)')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile && profile.is_active) {
              const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
              setCurrentUser({
                ...profile,
                permissions,
              });
            } else {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          console.error('Erreur vérification session Supabase:', err);
          setCurrentUser(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*, user_permissions(permission_key)')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile && profile.is_active) {
              const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
              setCurrentUser({
                ...profile,
                permissions,
              });
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
          }
        });

        unsubscribeAuth = () => subscription.unsubscribe();
      } else {
        const savedUserId = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const user = MOCK_USERS.find(u => u.id === savedUserId) || MOCK_USERS[0];
        setCurrentUser(user);
      }
      setLoading(false);
    }

    initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const login = async (email: string, password?: string) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password || '',
        });

        if (error || !data.user) {
          return { success: false, error: error?.message || 'Identifiants invalides' };
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, user_permissions(permission_key)')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          return { success: false, error: 'Profil introuvable. Veuillez exécuter les scripts SQL dans Supabase.' };
        }

        if (!profile.is_active) {
          await supabase.auth.signOut();
          return { success: false, error: 'Ce compte est inactif ou en attente d\'activation par l\'administrateur.' };
        }

        const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
        setCurrentUser({
          ...profile,
          permissions,
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la connexion' };
      }
    } else {
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (user) {
        if (!user.is_active) {
          return { success: false, error: 'Compte désactivé. Veuillez contacter l\'administrateur.' };
        }
        setCurrentUser(user);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, user.id);
        return { success: true };
      }
      return { success: false, error: 'Utilisateur introuvable. Utilisez les comptes de démonstration ou configurez Supabase.' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Mode local actif. Utilisez la connexion directe.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: PRODUCTION_SITE_URL
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Tenter de récupérer le profil créé par le trigger on_auth_user_created
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, user_permissions(permission_key)')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.is_active) {
          const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
          setCurrentUser({
            ...profile,
            permissions,
          });
          return { success: true, isFirstAdmin: profile.role === 'super_admin' };
        }

        return { 
          success: true, 
          error: 'Compte créé avec succès ! S\'il s\'agit du premier compte, il a été promu Super Admin. Sinon, il est en attente d\'activation.' 
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la création du compte.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
  };

  const switchMockUser = (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, user.id);
    }
  };

  const isSuperAdmin = () => {
    return currentUser?.role === 'super_admin' && currentUser.is_active;
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!currentUser || !currentUser.is_active) return false;
    if (currentUser.role === 'super_admin') return true;
    return currentUser.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        signUp,
        logout,
        hasPermission,
        isSuperAdmin,
        switchMockUser,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
};
