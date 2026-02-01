import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({ title, value, change, icon: Icon, iconColor, className }: MetricCardProps) {
  return (
    <div className={cn("metric-card", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              change.value >= 0 ? "text-success" : "text-destructive"
            )}>
              {change.value >= 0 ? '+' : ''}{change.value}% {change.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            iconColor || "bg-primary/10"
          )}>
            <Icon className={cn("h-5 w-5", iconColor ? "text-current" : "text-primary")} />
          </div>
        )}
      </div>
    </div>
  );
}
