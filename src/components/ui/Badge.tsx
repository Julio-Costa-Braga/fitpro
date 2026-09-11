import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-card border border-border text-muted",
  success: "bg-green-500/10 border border-green-500/30 text-green-400",
  warning: "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400",
  danger: "bg-red-500/10 border border-red-500/30 text-red-400",
  info: "bg-blue-500/10 border border-blue-500/30 text-blue-400",
  accent: "bg-accent/10 border border-accent/30 text-accent",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
