import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { success, error: notifyError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LoginLocationState)?.from?.pathname || '/';

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!email.trim()) {
      next.email = 'El correo es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Ingresa un correo válido.';
    }

    if (!password) {
      next.password = 'La contraseña es obligatoria.';
    } else if (password.length < 3) {
      next.password = 'La contraseña debe tener al menos 3 caracteres.';
    }

    return next;
  }, [email, password]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      notifyError('Revisa los campos del formulario antes de continuar.');
      return;
    }

    const ok = await auth.login(email, password);
    if (ok) {
      success('Sesión iniciada correctamente.');
      navigate(from, { replace: true });
    } else {
      notifyError('Credenciales inválidas. Verifica tu correo y contraseña.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-xl sm:p-8"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Cercotec ERP
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa tus credenciales para acceder al sistema.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={e => setEmail(e.target.value.trim())}
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={`mt-1 block w-full rounded-xl border px-3 py-2 shadow-sm outline-none transition focus:ring-4 ${errors.email ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
            />
            {errors.email && (
              <p id="login-email-error" className="mt-1 text-sm text-rose-600">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contraseña</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={`mt-1 block w-full rounded-xl border px-3 py-2 shadow-sm outline-none transition focus:ring-4 ${errors.password ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
            />
            {errors.password && (
              <p id="login-password-error" className="mt-1 text-sm text-rose-600">
                {errors.password}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              className="rounded-2xl bg-[linear-gradient(135deg,_#2563eb,_#0ea5e9)] px-4 py-2 text-white shadow-[0_12px_30px_rgba(37,99,235,0.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(37,99,235,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={!isValid}
            >
              Entrar
            </button>
          </div>
        </form>
        <div className="mt-4 text-sm text-slate-600">
          <p>Usuarios de prueba:</p>
          <ul className="list-disc ml-5">
            <li>admin@cercotec.cl / admin123 (administrador)</li>
            <li>operador@cercotec.cl / op123 (operador)</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
