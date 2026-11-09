import { AlertCircle, Bot, CheckCircle2, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export const RegisterPage: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await api.register({
        display_name: displayName,
        email,
        password,
      });
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Pendaftaran gagal. Silakan coba kembali.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md dark:bg-brand-500">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Daftar Akun Baru
          </h2>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Mulai eksplorasi asisten AI multi-platform Anda
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="mt-3 text-base font-semibold text-emerald-900 dark:text-emerald-100">
              Registrasi Berhasil!
            </h3>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              Kami telah mengirimkan tautan verifikasi ke email <strong>{email}</strong>. Silakan
              buka email Anda untuk mengaktifkan akun.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Kembali ke Halaman Masuk
              </Link>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nama Lengkap / Tampilan
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Kata Sandi (Minimal 8 karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Daftar Akun</span>
              </button>
            </form>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Sudah memiliki akun?{' '}
              <Link
                to="/login"
                className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                Masuk di sini
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
