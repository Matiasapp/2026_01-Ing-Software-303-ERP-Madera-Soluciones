import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

type ConnectionStatus = 'loading' | 'connected' | 'disconnected';
type Alert = { type: 'success' | 'error'; text: string };

const ML_APP_ID = import.meta.env.VITE_ML_APP_ID as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : '';
const ML_CALLBACK_URL = `https://${projectRef}.supabase.co/functions/v1/ml-oauth-callback`;
const ML_WEBHOOK_URL = `https://${projectRef}.supabase.co/functions/v1/ml-webhook`;
const ML_AUTH_URL = ML_APP_ID
  ? `https://auth.mercadolibre.cl/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${encodeURIComponent(ML_CALLBACK_URL)}&scope=read+offline_access`
  : '';

const STEPS = [
  {
    title: 'Registra tu aplicación en ML Developers',
    desc: 'Ingresa a developers.mercadolibre.com, crea una cuenta y registra una nueva aplicación. Anota el App ID.',
  },
  {
    title: 'Configura la URL de autorización (Redirect URI)',
    desc: 'En la configuración de tu app ML, agrega esta URL como "Redirect URI":',
    code: ML_CALLBACK_URL,
  },
  {
    title: 'Configura el webhook',
    desc: 'En "Notificaciones", agrega la siguiente URL y activa el topic "orders_v2":',
    code: ML_WEBHOOK_URL,
  },
  {
    title: 'Agrega el App ID al archivo .env',
    desc: 'Abre el archivo .env en la raíz del proyecto y agrega la siguiente línea:',
    code: 'VITE_ML_APP_ID=tu_app_id_aqui',
  },
  {
    title: 'Despliega las Edge Functions en Supabase',
    desc: 'Ejecuta estos comandos en la terminal del proyecto:',
    code: [
      'npx supabase link --project-ref ' + projectRef,
      'npx supabase functions deploy ml-oauth-callback',
      'npx supabase functions deploy ml-webhook',
      '',
      '# Configura los secretos (reemplaza los valores):',
      'npx supabase secrets set ML_CLIENT_ID=<tu_app_id>',
      'npx supabase secrets set ML_CLIENT_SECRET=<tu_client_secret>',
      'npx supabase secrets set ML_REDIRECT_URI=' + ML_CALLBACK_URL,
      'npx supabase secrets set APP_URL=http://localhost:5173',
    ].join('\n'),
  },
  {
    title: 'Aplica la migración de base de datos',
    desc: 'Ejecuta el archivo SQL en el editor de Supabase (SQL Editor → New query):',
    code: 'sql/migrations/003_ml_integration.sql',
  },
  {
    title: 'Activa Realtime en Supabase',
    desc: 'En el Dashboard de Supabase → Database → Publications → supabase_realtime, activa la tabla "ventas" para recibir órdenes en tiempo real.',
  },
  {
    title: 'Conecta tu cuenta',
    desc: 'Completados los pasos anteriores, haz clic en "Conectar con Mercado Libre". Serás redirigido a ML para autorizar el acceso.',
  },
];

const Configuracion: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [mlInfo, setMlInfo] = useState<{ sellerId: string; updatedAt: string } | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mlParam = params.get('ml');
    if (mlParam === 'connected') {
      setAlert({ type: 'success', text: 'Cuenta de Mercado Libre conectada exitosamente.' });
      window.history.replaceState({}, '', '/configuracion');
    } else if (mlParam === 'error') {
      const reason = params.get('reason') ?? 'desconocido';
      setAlert({ type: 'error', text: `Error al conectar con Mercado Libre: ${reason.replace(/_/g, ' ')}.` });
      window.history.replaceState({}, '', '/configuracion');
    }
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus('loading');
    try {
      const { data } = await supabase.rpc('get_ml_connection_status');
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.is_connected) {
        setStatus('connected');
        setMlInfo({ sellerId: row.seller_id, updatedAt: row.updated_at });
      } else {
        setStatus('disconnected');
        setMlInfo(null);
      }
    } catch {
      setStatus('disconnected');
    }
  };

  const handleConnect = () => {
    if (ML_AUTH_URL) window.location.href = ML_AUTH_URL;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await supabase.rpc('disconnect_ml');
      setStatus('disconnected');
      setMlInfo(null);
      setAlert({ type: 'success', text: 'Cuenta de Mercado Libre desconectada.' });
    } catch {
      setAlert({ type: 'error', text: 'Error al desconectar la cuenta.' });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="overflow-hidden rounded-[2rem] border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-amber-100">Configuración · Madera Soluciones ERP</p>
            <h2 className="text-3xl font-semibold tracking-tight">Integraciones</h2>
            <p className="mt-1 max-w-2xl text-sm text-amber-50/90">
              Conecta el ERP con plataformas externas para sincronizar datos automáticamente.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-sm backdrop-blur">
            Webhook en tiempo real · OAuth 2.0
          </div>
        </div>
      </motion.header>

      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium ${
            alert.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span>{alert.text}</span>
          <button
            onClick={() => setAlert(null)}
            className="ml-4 text-current opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* ML Connection Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFE600] text-xl font-black text-[#333]">
              ML
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Mercado Libre</h3>
              <p className="text-sm text-slate-500">
                Importa órdenes pagadas en tiempo real mediante webhook. Sin intervención manual.
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === 'connected'
                ? 'bg-emerald-100 text-emerald-700'
                : status === 'loading'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {status === 'connected' ? 'Conectado' : status === 'loading' ? 'Verificando…' : 'No conectado'}
          </span>
        </div>

        {status === 'connected' && mlInfo && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vendedor ID
                </div>
                <div className="mt-1 font-mono text-sm text-slate-800">{mlInfo.sellerId}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Última sincronización
                </div>
                <div className="mt-1 text-sm text-slate-800">
                  {new Date(mlInfo.updatedAt).toLocaleString('es-CL')}
                </div>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"
            >
              {disconnecting ? 'Desconectando…' : 'Desconectar cuenta'}
            </button>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="mt-5">
            {!ML_APP_ID ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>VITE_ML_APP_ID no está configurado.</strong> Sigue la guía de abajo para
                registrar tu app en ML Developers y agregar el App ID al archivo .env.
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#FFE600] px-5 py-3 text-sm font-black text-[#333] shadow-[0_8px_20px_rgba(255,230,0,0.3)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,230,0,0.45)]"
              >
                <span className="text-base">ML</span>
                Conectar con Mercado Libre
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Setup Guide */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16 }}
        className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <h3 className="text-lg font-semibold text-slate-900">Guía de configuración</h3>
        <p className="mt-1 text-sm text-slate-500">
          Completa estos pasos una sola vez para activar la integración.
        </p>

        <ol className="mt-6 space-y-5">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="mt-0.5 text-sm text-slate-500">{step.desc}</div>
                {step.code && (
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-200">
                    {step.code}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      </motion.div>
    </section>
  );
};

export default Configuracion;
