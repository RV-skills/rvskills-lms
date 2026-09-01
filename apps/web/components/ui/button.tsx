import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600",
  secondary: "bg-transparent text-neutral-900 border border-neutral-500 hover:bg-neutral-100",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

const disabledLookClasses: Record<ButtonVariant, string> = {
  primary: "bg-neutral-100 text-neutral-500 hover:bg-neutral-100",
  secondary: "text-neutral-500 border-neutral-100 hover:bg-transparent",
  ghost: "text-neutral-500 hover:bg-transparent",
  danger: "bg-danger-light text-white/70 hover:bg-danger-light",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => {
    const isDisabledLook = disabled && !loading;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
          "disabled:cursor-not-allowed",
          isDisabledLook ? disabledLookClasses[variant] : variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";