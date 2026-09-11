"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  rightIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full bg-card border rounded-lg px-3 py-2.5 text-sm text-white",
            "placeholder:text-muted/60",
            "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60",
            "transition-all duration-200",
            icon ? "pl-10" : "",
            rightIcon ? "pr-10" : "",
            error
              ? "border-red-500/50 focus:ring-red-500/40 focus:border-red-500/60"
              : "border-border",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full bg-card border rounded-lg px-3 py-2.5 text-sm text-white",
          "placeholder:text-muted/60 resize-none",
          "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60",
          "transition-all duration-200",
          error
            ? "border-red-500/50 focus:ring-red-500/40 focus:border-red-500/60"
            : "border-border",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
