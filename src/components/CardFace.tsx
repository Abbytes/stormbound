import type { CardDef } from '../types/cards'

const RARITY_COLOR: Record<string, string> = {
  common: 'from-slate-500 to-slate-700',
  rare: 'from-sky-500 to-blue-700',
  epic: 'from-violet-500 to-purple-800',
  apex: 'from-amber-400 to-orange-700',
}

const FACTION_RING: Record<string, string> = {
  dawn: 'ring-cyan-400/80 shadow-cyan-500/30',
  pack: 'ring-violet-400/80 shadow-violet-500/30',
  neutral: 'ring-slate-400/60 shadow-slate-400/20',
}

const FACTION_BG: Record<string, string> = {
  dawn: 'bg-gradient-to-br from-cyan-900/90 via-slate-900 to-amber-950/80',
  pack: 'bg-gradient-to-br from-violet-950/95 via-slate-950 to-fuchsia-950/70',
  neutral: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950',
}

interface Props {
  card: CardDef
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  dimmed?: boolean
  onClick?: () => void
  className?: string
}

export function CardFace({
  card,
  size = 'md',
  selected,
  dimmed,
  onClick,
  className = '',
}: Props) {
  const dims =
    size === 'sm'
      ? 'w-[4.4rem] h-[6.2rem] text-[0.55rem]'
      : size === 'lg'
        ? 'w-44 h-64 text-sm'
        : 'w-[5.5rem] h-[7.8rem] text-[0.65rem]'

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative rounded-xl overflow-hidden ring-2 shadow-lg transition-transform active:scale-95',
        dims,
        FACTION_BG[card.faction],
        FACTION_RING[card.faction],
        selected ? 'scale-105 ring-yellow-300 shadow-yellow-400/40 -translate-y-2' : '',
        dimmed ? 'opacity-40' : '',
        className,
      ].join(' ')}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${RARITY_COLOR[card.rarity]}`}
      />
      {card.cost > 0 && (
        <div className="absolute top-2 left-1.5 w-5 h-5 rounded-full bg-cyan-300 text-slate-950 font-black flex items-center justify-center text-[0.6rem] shadow">
          {card.cost}
        </div>
      )}
      <div className="absolute top-2 right-1.5 text-[0.5rem] uppercase tracking-wider text-white/70 font-semibold">
        {card.rarity[0]}
      </div>
      <div className="flex flex-col items-center justify-center h-full px-1 pt-4 pb-2 gap-0.5">
        <div
          className={[
            'w-8 h-8 rounded-full mb-0.5 flex items-center justify-center text-lg',
            card.faction === 'dawn'
              ? 'bg-cyan-400/20 text-cyan-200'
              : card.faction === 'pack'
                ? 'bg-violet-400/20 text-violet-200'
                : 'bg-slate-400/20 text-slate-200',
          ].join(' ')}
        >
          {card.type === 'beast'
            ? '🐾'
            : card.type === 'relic'
              ? '⚔️'
              : card.type === 'storm'
                ? '⚡'
                : '📖'}
        </div>
        <div className="font-bold text-white leading-tight text-center line-clamp-2 px-0.5">
          {card.name}
        </div>
        {card.type === 'beast' && (
          <div className="mt-auto flex gap-1 text-white/90 font-mono font-semibold">
            <span className="text-rose-300">{card.atk}</span>
            <span className="text-white/40">/</span>
            <span className="text-sky-300">{card.def}</span>
            <span className="text-white/40">/</span>
            <span className="text-emerald-300">{card.hp}</span>
          </div>
        )}
        {card.keywords.length > 0 && (
          <div className="text-[0.5rem] text-amber-200/90 uppercase tracking-wide truncate w-full text-center">
            {card.keywords.join(' · ')}
          </div>
        )}
      </div>
    </button>
  )
}
