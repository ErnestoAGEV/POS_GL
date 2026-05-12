import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-pos-green hover:bg-green-600 text-white",
  danger: "bg-pos-red hover:bg-red-600 text-white",
  secondary: "bg-pos-blue hover:bg-blue-600 text-white",
  ghost: "bg-transparent hover:bg-pos-active text-pos-muted hover:text-pos-text",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-semibold
        transition-colors duration-150
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-pos-blue focus:ring-offset-2 focus:ring-offset-pos-bg
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
