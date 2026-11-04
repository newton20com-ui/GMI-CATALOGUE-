import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, PermissionKey } from '../types';
import { MOCK_USERS } from '../lib/mockData';
import { isSupabaseConfigured, supabase, ensureFreshSession, executeWithFreshSession } from '../lib/supabase';
import { PRODUCTION_SITE_URL } from '../lib/constants';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; isFirstAdmin?: boolean }>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  isInviteSession: boolean;
  clearInviteSession: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  isSuperAdmin: () => boolean;
  switchMockUser?: (userId: string) => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'gmi_catalog_current_user_id';
const LOCAL_STORAGE_PROFILE_KEY = 'gmi_catalog_cached_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialisation immédiate depuis le cache local pour éliminer tout clignotement ou déconnexion au Ctrl+R
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // JSON corrompu ou invalide
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const isDemoMode = !isSupabaseConfigured;
  const [isInviteSession, setIsInviteSession] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.hash.includes('type=invite') ||
      window.location.hash.includes('type=recovery')
    );
  });

  const clearInviteSession = () => {
    setIsInviteSession(false);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          // 1. Renouveler pro-activement le token si nécessaire AVANT d'exécuter des requêtes en base
          await ensureFreshSession();
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // 2. Récupérer le profil utilisateur avec protection contre les JWT expirés
            const { data: profile, error: profileErr } = await executeWithFreshSession(async () => {
              return await supabase
                .from('user_profiles')
                .select('*, user_permissions(permission_key)')
                .eq('id', session.user.id)
                .maybeSingle();
            });

            if (profile && profile.is_active) {
              const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
              const userObj: UserProfile = {
                ...profile,
                permissions,
              };
              setCurrentUser(userObj);
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userObj));
            } else if (profile && !profile.is_active) {
              // Compte désactivé par l'administrateur
              localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
              await supabase.auth.signOut();
              setCurrentUser(null);
            } else if (profileErr) {
              console.warn('Erreur temporaire profil, conservation du profil en cache:', profileErr.message);
              // Ne pas déconnecter si une version locale est déjà disponible
            }
          } else {
            // Aucune session ni refresh_token valide
            const cached = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
            if (!cached) {
              setCurrentUser(null);
            } else {
              // Double vérification au cas où un refresh en tâche de fond est en cours
              const refreshed = await ensureFreshSession();
              if (!refreshed) {
                localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
                setCurrentUser(null);
              }
            }
          }
        } catch (err) {
          console.error('Erreur vérification session Supabase:', err);
          // Préserver le profil en cache s'il existe
          const cached = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
          if (!cached) {
            setCurrentUser(null);
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
            setCurrentUser(null);
          } else if (session?.user) {
            try {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('*, user_permissions(permission_key)')
                .eq('id', session.user.id)
                .maybeSingle();

              if (profile && profile.is_active) {
                const permissions = (profile.user_permissions || []).map((p: any) => p.permission_key);
                const userObj: UserProfile = {
                  ...profile,
                  permissions,
                };
                setCurrentUser(userObj);
                localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userObj));
              }
            } catch (e) {
              console.warn('Erreur mise à jour profil via onAuthStateChange:', e);
            }
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
        const userObj: UserProfile = {
          ...profile,
          permissions,
        };
        setCurrentUser(userObj);
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userObj));

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
          const userObj: UserProfile = {
            ...profile,
            permissions,
          };
          setCurrentUser(userObj);
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userObj));
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
      try {
        await supabase.auth.signOut();
      } catch {
        //
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setCurrentUser(null);
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      clearInviteSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de la mise à jour du mot de passe.' };
    }
  };

  const resetPasswordEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: PRODUCTION_SITE_URL,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur lors de l'envoi de l'email de réinitialisation." };
    }
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
        updatePassword,
        resetPasswordEmail,
        isInviteSession,
        clearInviteSession,
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
