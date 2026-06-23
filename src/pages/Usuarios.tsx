import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

type Role = 'superadmin' | 'admin' | 'operator';

type ManagedUser = {
  id: string;
  email: string;
  role: Role;
  activo: boolean;
  created_at: string;
  last_sign_in: string | null;
};

const callAdminUsers = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    method: 'POST',
    body: payload,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Error en la operación.');
  return data;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const Usuarios: React.FC = () => {
  const { user: self } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('operator');
  const [creating, setCreating] = useState(false);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await callAdminUsers({ action: 'list' });
      setUsers(data.users as ManagedUser[]);
    } catch {
      notifyError('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notifyError('Ingresá un correo válido.');
      return;
    }
    if (password.length < 6) {
      notifyError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCreating(true);
    try {
      await callAdminUsers({ action: 'create', email, password, role });
      success(`Usuario ${email.trim().toLowerCase()} creado.`);
      setEmail('');
      setPassword('');
      setRole('operator');
      await load();
    } catch (err) {
      notifyError(`No se pudo crear el usuario: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (u: ManagedUser, newRole: Role) => {
    try {
      await callAdminUsers({ action: 'set_role', user_id: u.id, role: newRole });
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role: newRole } : x)));
      success(`Rol de ${u.email} actualizado a ${newRole}.`);
    } catch (err) {
      notifyError(`No se pudo cambiar el rol: ${(err as Error).message}`);
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    try {
      await callAdminUsers({ action: 'set_active', user_id: u.id, activo: !u.activo });
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, activo: !x.activo } : x)));
      success(`Usuario ${u.email} ${u.activo ? 'desactivado' : 'activado'}.`);
    } catch (err) {
      notifyError(`No se pudo cambiar el estado: ${(err as Error).message}`);
    }
  };

  const submitReset = async (u: ManagedUser) => {
    if (resetValue.length < 6) {
      notifyError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      await callAdminUsers({ action: 'reset_password', user_id: u.id, password: resetValue });
      success(`Contraseña de ${u.email} actualizada.`);
      setResettingId(null);
      setResetValue('');
    } catch (err) {
      notifyError(`No se pudo resetear la contraseña: ${(err as Error).message}`);
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
        <p className="text-sm/6 text-amber-100">Administración · Madera Soluciones ERP</p>
        <h2 className="text-3xl font-semibold tracking-tight">Usuarios y roles</h2>
        <p className="mt-1 max-w-2xl text-sm text-amber-50/90">
          Crea cuentas para tu equipo y asignales un rol. <strong>Admin</strong> accede a todo;{' '}
          <strong>Operador</strong> solo a Dashboard, Cobranza, Ventas y Clientes.
        </p>
      </motion.header>

      {/* Crear usuario */}
      <motion.form
        onSubmit={handleCreate}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Crear usuario</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="correo@empresa.cl"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="text"
            placeholder="Contraseña inicial (mín. 6)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as Role)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="operator">Operador</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {creating ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </motion.form>

      {/* Lista de usuarios */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Usuarios ({users.length})</h3>
          <button onClick={load} className="text-sm font-semibold text-amber-700 hover:underline">
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">Cargando usuarios…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Última conexión</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => {
                  const isSelf = self?.email === u.email;
                  const isSuper = u.role === 'superadmin';
                  // Bloqueado: no se modifica desde la app (uno mismo o un superadmin).
                  const locked = isSelf || isSuper;
                  return (
                    <React.Fragment key={u.id}>
                      <tr className="text-slate-700">
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {u.email}
                          {isSelf && (
                            <span className="ml-2 text-xs text-slate-400">(Usuario actual)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSuper ? (
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                              Superadmin
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={e => changeRole(u, e.target.value as Role)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                            >
                              <option value="operator">Operador</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              u.activo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(u.last_sign_in)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setResettingId(resettingId === u.id ? null : u.id);
                                setResetValue('');
                              }}
                              disabled={isSuper}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              Contraseña
                            </button>
                            <button
                              onClick={() => toggleActive(u)}
                              disabled={locked}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${
                                u.activo
                                  ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {resettingId === u.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-slate-600">
                                Nueva contraseña para {u.email}:
                              </span>
                              <input
                                value={resetValue}
                                onChange={e => setResetValue(e.target.value)}
                                type="text"
                                placeholder="mín. 6 caracteres"
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                              />
                              <button
                                onClick={() => submitReset(u)}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setResettingId(null)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default Usuarios;
