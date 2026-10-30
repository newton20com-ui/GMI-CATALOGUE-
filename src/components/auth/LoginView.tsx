import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogIn, Lock, Mail, AlertCircle, Info, Sparkles, UserPlus, CheckCircle } from 'lucide-react';
import { MOCK_USERS } from '../../lib/mockData';
import { isSupabaseConfigured } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { login, signUp, isDemoMode } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Veuillez renseigner votre adresse email.');
      return;
    }

    if (!password) {
      setErrorMsg('Veuillez renseigner un mot de passe.');
      return;
    }

    setLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Veuillez renseigner votre nom complet.');
        setLoading(false);
        return;
      }
      const res = await signUp(email, password, fullName);
      setLoading(false);
      if (res.success) {
        setSuccessMsg(res.error || 'Compte créé ! Vous pouvez maintenant vous connecter.');
        setMode('login');
      } else {
        setErrorMsg(res.error || 'Erreur lors de la création du compte.');
      }
    } else {
      const res = await login(email, password);
      setLoading(false);
      if (!res.success) {
        setErrorMsg(res.error || 'Erreur lors de la connexion.');
      }
    }
  };

  const handleQuickLogin = async (mockEmail: string) => {
    setEmail(mockEmail);
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    const res = await login(mockEmail);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 items-center justify-center text-white shadow-xl shadow-brand-600/30 mb-4 ring-4 ring-white/10">
          <span className="font-extrabold text-2xl tracking-wider">GMI</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          GMI — Catalogue Interne
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Général Matériel d'Imprimerie et de Sérigraphie • Burkina Faso
        </p>

        {isSupabaseConfigured && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Supabase Cloud Connecté
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-modal rounded-2xl border border-slate-100">
          
          {/* Tabs Login vs Signup */}
          <div className="flex border-b border-slate-100 mb-6">
            <button
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 pb-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
            {isSupabaseConfigured && (
              <button
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 pb-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                  mode === 'signup'
                    ? 'border-b-2 border-brand-600 text-brand-600'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Premier Administrateur
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom et Prénom
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Direction GMI"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@gmi.bf"
                  required
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe {mode === 'signup' && '(min. 6 caractères)'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 font-semibold mt-2 shadow-md shadow-brand-600/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {mode === 'signup' ? 'Création...' : 'Connexion...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  {mode === 'signup' ? 'Initialiser le compte Administrateur' : 'Se connecter au catalogue'}
                </span>
              )}
            </button>
          </form>

          {/* Quick Login Profiles for local testing */}
          {isDemoMode && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Connexion rapide pour démonstration locale :</span>
              </div>
              
              <div className="space-y-2">
                {MOCK_USERS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u.email)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all flex items-center justify-between text-xs group"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 group-hover:text-brand-700">{u.full_name}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Commercial' : 'Magasinier'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Note Supabase :</strong> Le tout premier compte créé via l'onglet <em>"Premier Administrateur"</em> est automatiquement promu <strong>Super Administrateur protégé</strong> avec toutes les permissions.
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
