import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Mail } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const icons = {
    paid: Check,
    pending: Clock,
    overdue: AlertTriangle,
    sent: Mail,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1 font-medium capitalize",
        getStatusColor(status),
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}
