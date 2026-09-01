import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={error || undefined}
          className={cn(
            "h-10 w-full appearance-none rounded-md border border-neutral-500 bg-white pl-3 pr-8 text-sm text-neutral-900",
            "focus:border-primary-500 focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
            error && "border-danger focus:border-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";