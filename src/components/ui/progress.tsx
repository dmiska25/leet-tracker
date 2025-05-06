interface Props {
  /** 0‑100 */
  value: number;
}

export function ProgressBar({ value }: Props) {
  const colour =
    value < 40 ? 'bg-leetcode-hard' : value < 70 ? 'bg-leetcode-medium' : 'bg-leetcode-easy';

  return (
    <div className="relative w-full h-2 rounded-full bg-secondary border border-border">
      <div
        className={`h-full ${colour} transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
