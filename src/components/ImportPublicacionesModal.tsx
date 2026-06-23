import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { fetchProductos } from '../lib/supabase-queries';
import { categoryOptions } from '../pages/inventario/constants';
import type { ProductCategory } from '../context/InventoryContext';

export type UnmatchedPub = {
  meli_item_id: string;
  title: string;
  sku: string | null;
  motivo: string;
  precio: number;
  cantidad_disponible: number;
  estado_publicacion: 'active' | 'paused' | 'closed';
};

type ProductoOpt = { id: number; sku: string; nombre: string };

type Decision = {
  action: 'skip' | 'link' | 'create';
  producto_id: string; // id como string (valor del <select>)
  sku: string;
  nombre: string;
  categoria: ProductCategory | '';
  costo_compra: string;
  stock_actual: string;
};

type ImportResult = { creados: number; vinculados: number; errores: { meli_item_id: string; error: string }[] };

const MOTIVO_LABEL: Record<string, string> = {
  sin_sku: 'Sin SKU en ML',
  sin_sku_con_variaciones: 'Con variaciones, sin SKU',
  sku_no_encontrado: 'SKU no está en el inventario',
};

const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const initialDecision = (pub: UnmatchedPub): Decision => ({
  action: 'skip',
  producto_id: '',
  sku: pub.sku ?? '',
  nombre: pub.title,
  categoria: '',
  costo_compra: '',
  stock_actual: String(pub.cantidad_disponible ?? 0),
});

const ImportPublicacionesModal: React.FC<{
  publicaciones: UnmatchedPub[];
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}> = ({ publicaciones, onClose, onImported }) => {
  const [productos, setProductos] = useState<ProductoOpt[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(publicaciones.map(p => [p.meli_item_id, initialDecision(p)])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductos()
      .then(rows =>
        setProductos(
          (rows as any[]).map(r => ({ id: r.id, sku: r.sku, nombre: r.nombre })),
        ),
      )
      .catch(() => setError('No se pudo cargar el catálogo de productos.'));
  }, []);

  const update = (id: string, patch: Partial<Decision>) =>
    setDecisions(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const pendientes = useMemo(
    () => Object.values(decisions).filter(d => d.action !== 'skip').length,
    [decisions],
  );

  const handleImport = async () => {
    setError(null);
    const items: any[] = [];

    for (const pub of publicaciones) {
      const d = decisions[pub.meli_item_id];
      if (d.action === 'skip') continue;

      if (d.action === 'link') {
        if (!d.producto_id) {
          setError(`Elegí un producto para "${pub.title}" o cambialo a Omitir.`);
          return;
        }
        items.push({
          meli_item_id: pub.meli_item_id,
          precio_publicado: pub.precio,
          estado_publicacion: pub.estado_publicacion,
          action: 'link',
          producto_id: Number(d.producto_id),
        });
      } else {
        const costo = Number(d.costo_compra);
        const stock = Number(d.stock_actual);
        if (!d.sku.trim() || !d.nombre.trim() || !d.categoria) {
          setError(`Completá SKU, nombre y categoría para "${pub.title}".`);
          return;
        }
        if (!Number.isFinite(costo) || costo < 0) {
          setError(`El costo de compra de "${pub.title}" no es válido.`);
          return;
        }
        if (!Number.isFinite(stock) || stock < 0) {
          setError(`El stock inicial de "${pub.title}" no es válido.`);
          return;
        }
        items.push({
          meli_item_id: pub.meli_item_id,
          precio_publicado: pub.precio,
          estado_publicacion: pub.estado_publicacion,
          action: 'create',
          producto: {
            sku: d.sku.trim(),
            nombre: d.nombre.trim(),
            categoria: d.categoria,
            costo_compra: costo,
            precio_ml: pub.precio,
            stock_actual: stock,
          },
        });
      }
    }

    if (items.length === 0) {
      setError('No marcaste ninguna publicación para vincular o crear.');
      return;
    }

    setSaving(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ml-import-publicaciones', {
        method: 'POST',
        body: { items },
      });
      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error ?? 'import_failed');
      onImported(data as ImportResult);
    } catch {
      setError('Error al importar. Revisá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Importar publicaciones sin vincular</h3>
            <p className="text-sm text-slate-500">
              Para cada publicación, vinculala a un producto que ya existe o creá uno nuevo.
              Varias publicaciones del mismo producto deben apuntar al mismo producto.
            </p>
          </div>
          <button onClick={onClose} className="ml-4 text-2xl leading-none text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {publicaciones.map(pub => {
            const d = decisions[pub.meli_item_id];
            return (
              <div key={pub.meli_item_id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{pub.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="font-mono">{pub.meli_item_id}</span>
                      <span>· {clp(pub.precio)}</span>
                      <span>· Stock ML: {pub.cantidad_disponible}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                        {MOTIVO_LABEL[pub.motivo] ?? pub.motivo}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 text-sm">
                  {(['skip', 'link', 'create'] as const).map(action => (
                    <button
                      key={action}
                      onClick={() => update(pub.meli_item_id, { action })}
                      className={`rounded-xl px-3 py-1.5 font-medium transition ${
                        d.action === action
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {action === 'skip' ? 'Omitir' : action === 'link' ? 'Vincular a existente' : 'Crear nuevo'}
                    </button>
                  ))}
                </div>

                {d.action === 'link' && (
                  <div className="mt-3">
                    <select
                      value={d.producto_id}
                      onChange={e => update(pub.meli_item_id, { producto_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Seleccioná un producto…</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {d.action === 'create' && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="text-xs text-slate-500">
                      SKU
                      <input
                        value={d.sku}
                        onChange={e => update(pub.meli_item_id, { sku: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="col-span-2 text-xs text-slate-500">
                      Nombre
                      <input
                        value={d.nombre}
                        onChange={e => update(pub.meli_item_id, { nombre: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="text-xs text-slate-500">
                      Categoría
                      <select
                        value={d.categoria}
                        onChange={e => update(pub.meli_item_id, { categoria: e.target.value as ProductCategory })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="">Elegí…</option>
                        {categoryOptions.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Costo de compra
                      <input
                        type="number"
                        min={0}
                        value={d.costo_compra}
                        onChange={e => update(pub.meli_item_id, { costo_compra: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="text-xs text-slate-500">
                      Stock inicial
                      <input
                        type="number"
                        min={0}
                        value={d.stock_actual}
                        onChange={e => update(pub.meli_item_id, { stock_actual: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <div className="text-xs text-slate-500">
                      Precio ML
                      <div className="mt-1 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                        {clp(pub.precio)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <span className="text-sm text-slate-500">{pendientes} publicación(es) marcada(s)</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={saving || pendientes === 0}
              className="rounded-2xl bg-amber-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportPublicacionesModal;
