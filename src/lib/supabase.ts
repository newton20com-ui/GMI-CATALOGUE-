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
      console.warn('Aucune session active détectée:', sessionError);
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
        console.warn('Échec du renouvellement automatique du jeton Supabase:', refreshError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('Erreur inattendue lors de la vérification de session:', err);
    return false;
  }
}
