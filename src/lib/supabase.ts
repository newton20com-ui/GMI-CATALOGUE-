import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vknzaptggqkcdwadlemm.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbnphcHRnZ3FrY2R3YWRsZW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzE0MzgsImV4cCI6MjEwODk0NzQzOH0.4TzjqhQEXYAZAQoU0kqYZSm9h_UeDpHDFkdfCxToxeY';

// Indicateur si Supabase est effectivement configuré avec des clés réelles
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20
);

// Client Supabase réel configuré pour rafraîchir automatiquement les sessions et persister l'authentification
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://mock-gmi-project.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock_key');

/**
 * Crée un client Supabase temporaire et isolé pour les opérations d'inscription par l'administrateur.
 * Grâce à persistSession: false, cette instance n'écrit rien dans le localStorage
 * et n'écrase JAMAIS la session active de l'administrateur connecté.
 */
export function createIsolatedAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Vérifie et renouvelle proactivement le jeton d'authentification Supabase (JWT)
 * avant toute opération sensible (création/modification d'utilisateur, sauvegarde de produit, import CSV)
 * pour éliminer complètement l'erreur "JWT expired".
 */
export async function ensureFreshSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return false;
    }

    // Calculer le temps restant avant expiration du jeton (en millisecondes)
    const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
    const nowMs = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;

    // Si le jeton expire dans moins de 10 minutes ou est déjà expiré, le renouveler immédiatement
    if (expiresAtMs - nowMs < tenMinutesMs) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.warn('Tentative de renouvellement du jeton Supabase:', refreshError?.message);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('Erreur lors de la vérification de session:', err);
    return false;
  }
}

/**
 * Exécute une opération Supabase avec garantie de jeton frais.
 * En cas d'erreur "JWT expired", renouvelle immédiatement la session et réessaie automatiquement.
 */
export async function executeWithFreshSession<T>(operation: () => Promise<T>): Promise<T> {
  await ensureFreshSession();
  try {
    return await operation();
  } catch (err: any) {
    const isJwtExpired = 
      err?.message?.toLowerCase().includes('jwt expired') ||
      err?.message?.toLowerCase().includes('invalid claim') ||
      err?.code === 'PGRST301' ||
      err?.status === 401;

    if (isJwtExpired) {
      console.warn('JWT expiré détecté. Renouvellement transparent de la session en cours...');
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data?.session) {
        // Réessayer l'opération une seconde fois avec le nouveau jeton
        return await operation();
      }
    }
    throw err;
  }
}

// Renouvellement automatique du jeton dès la sortie de veille ou le retour sur l'application (PWA ou Onglet)
if (typeof window !== 'undefined') {
  const handleWakeUp = () => {
    if (document.visibilityState === 'visible') {
      ensureFreshSession().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', handleWakeUp);
  window.addEventListener('focus', handleWakeUp);
}
