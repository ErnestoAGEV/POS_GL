import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-pos-muted font-medium">{label}</label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            bg-pos-card border border-slate-700
            text-pos-text placeholder:text-slate-500
            px-4 py-2.5 rounded-lg text-base
            focus:outline-none focus:ring-2 focus:ring-pos-blue focus:border-transparent
            transition-colors duration-150
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
