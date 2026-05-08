import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const baseClass =
  'block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
      <input ref={ref} className={`${baseClass} ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, className = '', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
      <textarea ref={ref} className={`${baseClass} resize-none ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
