import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error, setError } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      login(form.username, form.password);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 max-w-md mx-auto">
      {/* Logo / Brand */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
          <span className="text-4xl">💰</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Rinci</h1>
        <p className="text-gray-500 text-sm mt-1">Manajemen Keuangan Keluarga</p>
      </div>

      {/* Form */}
      <div className="w-full card animate-slide-up">
        <h2 className="text-lg font-semibold text-white mb-6">Masuk ke Akun</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="label">Username</label>
            <input
              id="username"
              type="text"
              className="input-field"
              placeholder="Masukkan username"
              value={form.username}
              onChange={(e) => { setForm(f => ({ ...f, username: e.target.value })); setError(''); }}
              required
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="Masukkan password"
                value={form.password}
                onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="btn-login"
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </>
            ) : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Demo: username <span className="text-gray-400 font-mono">user</span> / password <span className="text-gray-400 font-mono">user</span>
        </p>
      </div>
    </div>
  );
}
