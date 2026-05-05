export function Header({ totalNights, totalSamples }: { totalNights: number; totalSamples: number }) {
  return (
    <header className="hairline-b">
      <div className="px-8 py-6 flex items-baseline justify-between">
        <div className="flex items-baseline gap-6">
          <div className="flex items-baseline gap-2">
            <span className="label-eyebrow">Quantself</span>
            <span className="text-ink-500">/</span>
            <span className="label-eyebrow text-pulse">Sleeping HR</span>
          </div>
        </div>
        <div className="flex items-baseline gap-8 tnum">
          <Stat label="Nights" value={totalNights.toLocaleString()} />
          <Stat label="HR Samples" value={totalSamples.toLocaleString()} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label-eyebrow">{label}</span>
      <span className="font-mono text-xs text-ink-200">{value}</span>
    </div>
  );
}
