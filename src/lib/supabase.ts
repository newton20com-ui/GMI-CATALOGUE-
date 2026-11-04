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
 * Exécute une opération Supabase avec garantie de jeton frais.
 * En cas d'erreur "JWT expired" ou 401, renouvelle immédiatement la session et réessaie automatiquement.
 */
export async function executeWithFreshSession<T>(operation: () => Promise<T>): Promise<T> {
  await ensureFreshSession();
  try {
    return await operation();
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    const isJwtExpired = 
      errMsg.includes('jwt expired') ||
      errMsg.includes('invalid claim') ||
      errMsg.includes('token is expired') ||
      err?.code === 'PGRST301' ||
      err?.status === 401 ||
      err?.statusCode === '401';

    if (isJwtExpired) {
      console.warn('JWT expiré détecté. Renouvellement transparent de la session en cours...');
      try {
        let renewed = false;
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data?.session) {
          renewed = true;
        } else {
          const refreshToken = getStoredRefreshToken();
          if (refreshToken) {
            const forcedRef = await supabase.auth.refreshSession({ refresh_token: refreshToken });
            if (forcedRef.data?.session) {
              renewed = true;
            }
          }
        }
        if (renewed) {
          // Réessayer l'opération une seconde fois avec le nouveau jeton
          return await operation();
        }
      } catch (refErr) {
        console.warn('Échec du renouvellement lors du retry:', refErr);
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
