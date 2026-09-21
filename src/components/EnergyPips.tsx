export function EnergyPips({
  count,
  size = 'sm',
}: {
  count: number
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-3.5 h-3.5 text-[9px]' : 'w-5 h-5 text-[11px]'
  if (count <= 0) return null
  return (
    <div className="flex items-center gap-0.5 flex-wrap justify-center">
      {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
        <span
          key={i}
          className={`${dim} rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-amber-950 font-black flex items-center justify-center shadow`}
        >
          ⚡
        </span>
      ))}
      {count > 6 && (
        <span className="text-[10px] text-amber-200 font-bold">+{count - 6}</span>
      )}
    </div>
  )
}

export function EnergyCostIcons({ cost }: { cost: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: cost }).map((_, i) => (
        <span
          key={i}
          className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-[9px] flex items-center justify-center font-black text-amber-950"
        >
          ⚡
        </span>
      ))}
    </span>
  )
}
