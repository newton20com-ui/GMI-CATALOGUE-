// Supabase Edge Function : invite-user
// Permet à un administrateur du Catalogue GMI d'inviter ou de supprimer définitivement un collaborateur

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Gestion de la pré-vérification CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Variables d\'environnement Supabase manquantes sur le serveur.');
    }

    // 1. Vérifier l'identité de l'administrateur appelant
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Session non authentifiée. En-tête Authorization manquant.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Session expirée ou non autorisée. Veuillez vous reconnecter.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client Admin Supabase disposant de la clé de service (service_role)
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Vérifier que l'appelant est bien un administrateur autorisé
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileErr || !callerProfile || !callerProfile.is_active || (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé : Seuls les administrateurs peuvent gérer les utilisateurs.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Récupérer les paramètres
    const body = await req.json();
    const { action, userId, email, fullName, role, permissions } = body;

    // ACTION : SUPPRESSION DÉFINITIVE D'UN UTILISATEUR
    if (action === 'delete') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Identifiant userId manquant pour la suppression.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier que la cible n'est pas le Super Admin protégé
      const { data: targetProfile } = await adminClient
        .from('user_profiles')
        .select('is_protected, email')
        .eq('id', userId)
        .maybeSingle();

      if (targetProfile?.is_protected) {
        return new Response(
          JSON.stringify({ error: 'Sécurité : Le compte Administrateur Principal protégé ne peut pas être supprimé.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Supprimer l'utilisateur de auth.users (libère l'email pour une réinvitation future)
      await adminClient.auth.admin.deleteUser(userId);

      // 2. Supprimer de user_profiles et user_permissions
      await adminClient.from('user_permissions').delete().eq('user_id', userId);
      await adminClient.from('user_profiles').delete().eq('id', userId);

      return new Response(
        JSON.stringify({ success: true, message: 'Utilisateur supprimé définitivement.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTION : INVITATION PAR EMAIL
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Adresse email invalide.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = (fullName || cleanEmail.split('@')[0]).trim();
    const targetRole = role === 'admin' ? 'admin' : 'staff';
    const redirectUrl = 'https://gmi-catalogue.newton2-0-com.workers.dev/';

    // 3. Envoyer l'email d'invitation avec lien magique via le module Admin de Supabase
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: { full_name: cleanFullName },
        redirectTo: redirectUrl,
      }
    );

    if (inviteError) {
      if (inviteError.message?.toLowerCase().includes('already registered')) {
        return new Response(
          JSON.stringify({ error: `Cette adresse email (${cleanEmail}) possède déjà un compte dans le système.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Erreur d'invitation Supabase : ${inviteError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user?.id;
    if (!newUserId) {
      throw new Error('Identifiant utilisateur introuvable après l\'envoi de l\'invitation.');
    }

    // 4. Créer ou mettre à jour la fiche profil dans user_profiles
    const { error: upsertErr } = await adminClient
      .from('user_profiles')
      .upsert({
        id: newUserId,
        email: cleanEmail,
        full_name: cleanFullName,
        role: targetRole,
        is_active: true,
        is_protected: false,
        updated_at: new Date().toISOString(),
      });

    if (upsertErr) {
      console.warn('Avertissement profil:', upsertErr);
    }

    // 5. Configurer les permissions accordées
    const permsToInsert: string[] = Array.isArray(permissions) && permissions.length > 0 
      ? permissions 
      : ['catalog:view'];

    await adminClient.from('user_permissions').delete().eq('user_id', newUserId);
    await adminClient.from('user_permissions').insert(
      permsToInsert.map((p) => ({ user_id: newUserId, permission_key: p }))
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        userId: newUserId,
        email: cleanEmail,
        fullName: cleanFullName,
        role: targetRole,
        message: `Email d'invitation avec lien d'accès envoyé à ${cleanEmail}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne du serveur.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
