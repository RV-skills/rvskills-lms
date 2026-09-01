import { InputHTMLAttributes, forwardRef, useId } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorText?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, helperText, errorText, id, className, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const messageId = `${fieldId}-message`;
    const hasError = Boolean(errorText);

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-neutral-900">
          {label}
        </label>
        <Input
          ref={ref}
          id={fieldId}
          error={hasError}
          aria-describedby={helperText || errorText ? messageId : undefined}
          className={className}
          {...props}
        />
        {(helperText || errorText) && (
          <span
            id={messageId}
            className={cn("text-xs", hasError ? "text-danger" : "text-neutral-500")}
          >
            {errorText || helperText}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";