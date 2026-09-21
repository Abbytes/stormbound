import type { BoardBeast } from '../game/engine'
import { cardById } from '../data/cards'

interface Props {
  beast: BoardBeast | null
  side: 'player' | 'enemy'
  slot: number
  glow: 'dawn' | 'pack'
  droppable?: boolean
  onTap?: () => void
  onDrop?: () => void
}

export function BoardSlot({ beast, side, glow, droppable, onTap, onDrop }: Props) {
  const glowClass =
    glow === 'dawn'
      ? 'shadow-[0_0_18px_rgba(34,211,238,0.35)] border-cyan-400/40'
      : 'shadow-[0_0_18px_rgba(168,85,247,0.35)] border-violet-400/40'

  return (
    <button
      type="button"
      onClick={() => {
        if (droppable && onDrop) onDrop()
        else onTap?.()
      }}
      className={[
        'relative flex-1 min-w-0 aspect-[3/4] max-h-28 rounded-lg border-2 bg-stone-900/70',
        'flex flex-col items-center justify-center transition',
        glowClass,
        droppable ? 'ring-2 ring-yellow-300/80 animate-pulse' : '',
        beast?.attacking ? 'ring-2 ring-rose-400 -translate-y-1' : '',
        beast?.huntMarked ? 'outline outline-2 outline-amber-400' : '',
      ].join(' ')}
    >
      {/* stone floor hint */}
      <div className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_bottom,rgba(120,113,108,0.35),transparent_70%)] pointer-events-none" />
      {beast ? (
        <>
          <div className="text-[0.55rem] font-bold text-white text-center leading-tight px-0.5 z-10 line-clamp-2">
            {cardById(beast.cardId).name}
          </div>
          <div className="z-10 mt-0.5 font-mono text-[0.65rem] text-white">
            <span className="text-rose-300">{beast.atk + beast.tempAtk}</span>
            <span className="text-white/40">/</span>
            <span className="text-sky-300">{beast.def}</span>
            <span className="text-white/40">/</span>
            <span className="text-emerald-300">{beast.hp}</span>
          </div>
          <div className="z-10 flex gap-0.5 mt-0.5 flex-wrap justify-center">
            {beast.ward && (
              <span className="text-[0.45rem] px-1 rounded bg-sky-500/40 text-sky-100">W</span>
            )}
            {beast.bonded && (
              <span className="text-[0.45rem] px-1 rounded bg-amber-500/40 text-amber-100">B</span>
            )}
            {beast.keywords.includes('flight') && (
              <span className="text-[0.45rem] px-1 rounded bg-indigo-500/40 text-indigo-100">F</span>
            )}
            {beast.keywords.includes('guard') && (
              <span className="text-[0.45rem] px-1 rounded bg-emerald-500/40 text-emerald-100">G</span>
            )}
            {beast.summonSick && side === 'player' && (
              <span className="text-[0.45rem] px-1 rounded bg-stone-500/50 text-stone-200">💤</span>
            )}
          </div>
        </>
      ) : (
        <span className="text-[0.5rem] text-white/25 uppercase tracking-widest z-10">
          {droppable ? 'Play' : 'Empty'}
        </span>
      )}
    </button>
  )
}
