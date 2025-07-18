import type { Solve } from '@/types/types';
import { Badge } from '@/components/ui/badge';

/**
 * Coloured badge showing a solve's submission status.
 *  - accepted  -> green
 *  - others    -> red
 *  - undefined -> muted "Unknown"
 */
export function StatusBadge({ status }: { status: Solve['status'] | undefined }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 bg-muted text-muted-foreground">
        Unknown
      </Badge>
    );
  }

  const ok = status === 'Accepted';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={`text-[11px] px-1.5 py-0.5 ${
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {label}
    </Badge>
  );
}
