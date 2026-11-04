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
 * Recherche et extrait le refresh_token Supabase stocké dans le localStorage
 * quel que soit l'identifiant du projet Supabase.
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.refresh_token) return parsed.refresh_token;
        }
      }
    }
  } catch {
    //
  }
  return null;
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
    
    // Si aucune session n'est retournée directement par getSession()
    if (sessionError || !session) {
      const storedRefreshToken = getStoredRefreshToken();
      if (storedRefreshToken) {
        try {
          const { data: refreshed, error: refErr } = await supabase.auth.refreshSession({
            refresh_token: storedRefreshToken,
          });
          if (!refErr && refreshed.session) {
            return true;
          }
        } catch {
          //
        }
      }
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
        // En cas d'échec du rafraîchissement standard, tenter avec le refresh_token extrait
        const storedRefreshToken = getStoredRefreshToken();
        if (storedRefreshToken) {
          const { data: forced, error: forcedErr } = await supabase.auth.refreshSession({
            refresh_token: storedRefreshToken,
          });
          if (!forcedErr && forced.session) {
            return true;
          }
        }
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
 * Détecte si une erreur ou un message correspond à une expiration ou invalidation du jeton JWT Supabase
 */
export function isJwtError(err: any): boolean {
  if (!err) return false;
  const errMsg = (err.message || err.error_description || (typeof err === 'string' ? err : JSON.stringify(err))).toLowerCase();
  return (
    errMsg.includes('jwt expired') ||
    errMsg.includes('invalid claim') ||
    errMsg.includes('token is expired') ||
    errMsg.includes('jwt') ||
    err.code === 'PGRST301' ||
    err.status === 401 ||
    err.statusCode === '401'
  );
}

/**
 * Exécute une opération Supabase avec garantie de jeton frais.
 * En cas d'erreur "JWT expired" ou 401 (rejetée ou retournée dans l'objet résultat),
 * renouvelle immédiatement la session en arrière-plan et réessaie automatiquement l'opération.
 */
export async function executeWithFreshSession<T>(operation: () => Promise<T>): Promise<T> {
  await ensureFreshSession();
  try {
    const result = await operation();
    // Cas où le client PostgREST résout la promesse avec un objet { error } sans lever d'exception
    if (result && typeof result === 'object' && 'error' in (result as any)) {
      const resError = (result as any).error;
      if (resError && isJwtError(resError)) {
        console.warn('Erreur JWT détectée dans la réponse PostgREST, tentative de réessai...');
        const renewed = await forceRefreshSession();
        if (renewed) {
          return await operation();
        }
      }
    }
    return result;
  } catch (err: any) {
    if (isJwtError(err)) {
      console.warn('Exception JWT expirée interceptée. Renouvellement transparent de la session en cours...');
      const renewed = await forceRefreshSession();
      if (renewed) {
        // Réessayer l'opération une seconde fois avec le nouveau jeton
        return await operation();
      }
    }
    throw err;
  }
}

/**
 * Force le renouvellement immédiat de la session Supabase
 */
export async function forceRefreshSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data?.session) {
      return true;
    }
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      const forcedRef = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (forcedRef.data?.session) {
        return true;
      }
    }
  } catch (refErr) {
    console.warn('Échec renouvellement forcé:', refErr);
  }
  return false;
}

// Battement de cœur permanent (Heartbeat) et réveil automatique
if (typeof window !== 'undefined') {
  // 1. Battement de cœur toutes les 2 minutes : maintient la session active et empêche l'expiration du JWT
  setInterval(() => {
    ensureFreshSession().catch(() => {});
  }, 2 * 60 * 1000);

  // 2. Détection d'interaction utilisateur (clic, frappe, tactile) avec limitation à une fois par minute
  let lastActivityPing = 0;
  const onUserActivity = () => {
    const now = Date.now();
    if (now - lastActivityPing > 60 * 1000) {
      lastActivityPing = now;
      ensureFreshSession().catch(() => {});
    }
  };

  window.addEventListener('click', onUserActivity, { passive: true });
  window.addEventListener('keydown', onUserActivity, { passive: true });
  window.addEventListener('touchstart', onUserActivity, { passive: true });
  window.addEventListener('focus', onUserActivity);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ensureFreshSession().catch(() => {});
    }
  });
}
