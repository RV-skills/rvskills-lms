import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "h-10 w-full rounded-md border border-neutral-500 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-500",
          "focus:border-primary-500 focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
          error && "border-danger focus:border-danger",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";