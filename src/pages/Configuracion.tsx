import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import ImportPublicacionesModal, {
  type UnmatchedPub,
} from '../components/ImportPublicacionesModal';

type ConnectionStatus = 'loading' | 'connected' | 'disconnected';
type Alert = { type: 'success' | 'error'; text: string };

const ML_APP_ID = import.meta.env.VITE_ML_APP_ID as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : '';
const ML_CALLBACK_URL = `https://${projectRef}.supabase.co/functions/v1/ml-oauth-callback`;
const ML_AUTH_URL = ML_APP_ID
  ? `https://auth.mercadolibre.cl/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${encodeURIComponent(ML_CALLBACK_URL)}&scope=read+offline_access`
  : '';

const Configuracion: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [mlInfo, setMlInfo] = useState<{ sellerId: string; updatedAt: string } | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [unmatched, setUnmatched] = useState<UnmatchedPub[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mlParam = params.get('ml');
    if (mlParam === 'connected') {
      setAlert({ type: 'success', text: 'Cuenta de Mercado Libre conectada exitosamente.' });
      window.history.replaceState({}, '', '/configuracion');
    } else if (mlParam === 'error') {
      const reason = params.get('reason') ?? 'desconocido';
      setAlert({
        type: 'error',
        text: `Error al conectar con Mercado Libre: ${reason.replace(/_/g, ' ')}.`,
      });
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

  const handleSync = async () => {
    setSyncing(true);
    setAlert(null);
    try {
      // Edge Function: trae las publicaciones de ML y las vincula a productos por SKU.
      const { data, error } = await supabase.functions.invoke('ml-sync-publicaciones', {
        method: 'POST',
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'sync_failed');

      const { vinculadas, sin_vincular, total_publicaciones } = data;
      setUnmatched((data.detalle_sin_vincular ?? []) as UnmatchedPub[]);
      setAlert({
        type: 'success',
        text:
          total_publicaciones === 0
            ? 'No se encontraron publicaciones en tu cuenta de Mercado Libre. ' +
              'Verifica que tengas publicaciones activas y que la cuenta conectada sea la correcta.'
            : `Sincronización lista: ${vinculadas} de ${total_publicaciones} publicaciones ` +
              `vinculadas a un producto. ${sin_vincular} sin vincular` +
              (sin_vincular > 0 ? ' (usá "Revisar sin vincular" para resolverlas).' : '.'),
      });
    } catch {
      setAlert({ type: 'error', text: 'Error al sincronizar las publicaciones de Mercado Libre.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      // Edge Function: borra credenciales con service_role y revoca en ML.
      const { error } = await supabase.functions.invoke('ml-disconnect', { method: 'POST' });
      if (error) throw error;
      // Re-verificamos el estado real en vez de asumir que se desconectó.
      await checkConnection();
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
            {status === 'connected'
              ? 'Conectado'
              : status === 'loading'
                ? 'Verificando…'
                : 'No conectado'}
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
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-100 disabled:opacity-50"
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar publicaciones'}
              </button>
              {unmatched.length > 0 && (
                <button
                  onClick={() => setShowImport(true)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Revisar sin vincular ({unmatched.length})
                </button>
              )}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:bg-rose-100 disabled:opacity-50"
              >
                {disconnecting ? 'Desconectando…' : 'Desconectar cuenta'}
              </button>
            </div>
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
                <span className="text-base">Conectar con Mercado Libre</span>
              </button>
            )}
          </div>
        )}
      </motion.div>

      {showImport && (
        <ImportPublicacionesModal
          publicaciones={unmatched}
          onClose={() => setShowImport(false)}
          onImported={result => {
            setShowImport(false);
            const importadosIds = new Set<string>();
            // Quitamos de la lista local las que ya se procesaron sin error.
            const conError = new Set(result.errores.map(e => e.meli_item_id));
            for (const pub of unmatched) {
              if (!conError.has(pub.meli_item_id)) importadosIds.add(pub.meli_item_id);
            }
            setUnmatched(prev => prev.filter(p => !importadosIds.has(p.meli_item_id)));
            setAlert({
              type: result.errores.length > 0 ? 'error' : 'success',
              text:
                `Importación: ${result.creados} producto(s) creado(s), ` +
                `${result.vinculados} publicación(es) vinculada(s).` +
                (result.errores.length > 0 ? ` ${result.errores.length} con error.` : ''),
            });
            if (result.errores.length > 0) console.table(result.errores);
          }}
        />
      )}
    </section>
  );
};

export default Configuracion;
