import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setMessage('Token verifikasi tidak ditemukan pada tautan.');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.verifyEmail(token);
        setIsSuccess(true);
        setMessage(res.message);
      } catch (err) {
        setIsSuccess(false);
        setMessage(err instanceof Error ? err.message : 'Verifikasi email gagal.');
      } finally {
        setIsLoading(false);
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Memverifikasi akun Anda...
            </p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Email Berhasil Diverifikasi!
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex rounded-lg bg-brand-600 px-5 py-2 text-xs font-medium text-white hover:bg-brand-500"
              >
                Masuk ke Akun Anda
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Verifikasi Gagal
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Kembali ke Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
