import React from 'react';

// Primitivos de formulario genéricos, reutilizables por cualquier página.

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  disabled?: boolean;
  hint?: string;
}> = ({ label, value, onChange, type = 'text', error, disabled, hint }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      disabled={disabled}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
    />
    {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);

export const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
  error?: string;
}> = ({ label, value, onChange, options, error }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
    >
      {options.map(option => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);
