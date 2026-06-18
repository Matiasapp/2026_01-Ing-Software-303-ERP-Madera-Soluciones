import React from 'react';

export const KpiCard: React.FC<{ title: string; value: React.ReactNode }> = ({ title, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="text-sm text-slate-500">{title}</div>
    <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
  </div>
);

export const MiniStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
  </div>
);
