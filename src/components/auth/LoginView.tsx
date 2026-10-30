import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogIn, Lock, Mail, AlertCircle, Info, Sparkles } from 'lucide-react';
import { MOCK_USERS } from '../../lib/mockData';

export const LoginView: React.FC = () => {
  const { login, isDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Veuillez renseigner votre adresse email.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Erreur lors de la connexion.');
    }
  };

  const handleQuickLogin = async (mockEmail: string) => {
    setEmail(mockEmail);
    setErrorMsg('');
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
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-modal rounded-2xl border border-slate-100">
          
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-600" />
              Accès Privé Sécurisé
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connectez-vous pour consulter et gérer les références de marchandises.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse email professionnelle
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
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  Vérification...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Se connecter au catalogue
                </span>
              )}
            </button>
          </form>

          {/* Quick Login Profiles for testing */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Connexion rapide pour démonstration & tests :</span>
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

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>
                Testez avec <strong>Magasinier</strong> pour vérifier que les prix d'achat/gros/revendeur restent strictement invisibles, ou avec <strong>Super Admin</strong> pour tout gérer.
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
