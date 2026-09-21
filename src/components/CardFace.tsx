import type { CardDef, Rarity } from '../types/cards'

interface Props {
  card: CardDef
  size?: 'hand' | 'board' | 'inspect' | 'binder'
  selected?: boolean
  dimmed?: boolean
  compact?: boolean
  atk?: number
  def?: number
  hp?: number
  onClick?: () => void
  className?: string
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  apex: 'APEX',
}

function artGlyph(card: CardDef): string {
  if (card.type === 'storm') return '⚡'
  if (card.type === 'relic') return '⚔️'
  if (card.type === 'binder') return '👑'
  const t = card.tags.join(' ').toLowerCase()
  if (t.includes('wolf') || t.includes('hound') || t.includes('howl')) return '🐺'
  if (t.includes('stag') || t.includes('elk')) return '🦌'
  if (t.includes('fox')) return '🦊'
  if (t.includes('boar') || t.includes('bear')) return '🐗'
  if (t.includes('cub') || t.includes('lion')) return '🦁'
  if (t.includes('wyvern') || t.includes('phoenix') || t.includes('raven')) return '🦅'
  if (t.includes('ram') || t.includes('goat')) return '🐏'
  if (t.includes('vulture')) return '🪶'
  return '🐾'
}

function borderClass(rarity: Rarity): string {
  if (rarity === 'apex') {
    return 'border-[3px] border-amber-300 card-apex-glow'
  }
  if (rarity === 'epic') {
    return 'border-[1.5px] border-violet-400/80 shadow-[0_0_10px_rgba(167,139,250,0.35)]'
  }
  if (rarity === 'rare') {
    return 'border-[1.5px] border-sky-400/70 shadow-[0_0_8px_rgba(56,189,248,0.25)]'
  }
  return 'border border-amber-700/60 shadow-[0_4px_12px_rgba(0,0,0,0.55)]'
}

function artBg(card: CardDef): string {
  if (card.faction === 'dawn') {
    return 'bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.45),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(251,191,36,0.25),transparent_50%),linear-gradient(160deg,#0c1a2e,#1a0f08)]'
  }
  if (card.faction === 'pack') {
    return 'bg-[radial-gradient(ellipse_at_30%_20%,rgba(168,85,247,0.5),transparent_55%),radial-gradient(ellipse_at_70%_90%,rgba(244,63,94,0.25),transparent_50%),linear-gradient(160deg,#1a0a22,#0a0610)]'
  }
  return 'bg-[radial-gradient(ellipse_at_50%_30%,rgba(148,163,184,0.35),transparent_55%),linear-gradient(160deg,#1e293b,#0f172a)]'
}

const SIZE: Record<NonNullable<Props['size']>, string> = {
  hand: 'w-[5.6rem] h-[8.4rem]',
  board: 'w-full h-full min-h-0',
  inspect: 'w-48 h-[17.5rem]',
  binder: 'w-[7.2rem] h-[10.8rem]',
}

export function CardFace({
  card,
  size = 'hand',
  selected,
  dimmed,
  compact,
  atk,
  def,
  hp,
  onClick,
  className = '',
}: Props) {
  const showStats = card.type === 'beast' || atk !== undefined
  const a = atk ?? card.atk ?? 0
  const d = def ?? card.def ?? 0
  const h = hp ?? card.hp ?? 0
  const tiny = size === 'board' || compact

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col overflow-hidden rounded-xl text-left transition-transform active:scale-[0.97]',
        'bg-gradient-to-b from-[#2a241c] via-[#1a1612] to-[#0d0b09]',
        SIZE[size],
        borderClass(card.rarity),
        selected ? 'scale-105 -translate-y-3 z-20 ring-2 ring-orange-400' : '',
        dimmed ? 'opacity-45 grayscale-[30%]' : '',
        className,
      ].join(' ')}
    >
      {/* metallic inner rim */}
      <div className="pointer-events-none absolute inset-[2px] rounded-[10px] border border-white/10" />

      {/* header */}
      <div className="relative z-10 flex items-start justify-between gap-1 px-1.5 pt-1.5 pb-0.5">
        <div
          className={[
            'font-bold text-white leading-tight line-clamp-2 flex-1 pr-1',
            tiny ? 'text-[0.52rem]' : size === 'inspect' ? 'text-sm' : 'text-[0.62rem]',
          ].join(' ')}
        >
          {card.name}
        </div>
        {card.cost > 0 && (
          <div
            className={[
              'shrink-0 rounded-full bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-700',
              'text-white font-black flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.6)]',
              'border border-sky-200/60',
              tiny ? 'w-4 h-4 text-[0.5rem]' : 'w-5 h-5 text-[0.65rem]',
            ].join(' ')}
          >
            {card.cost}
          </div>
        )}
      </div>

      {/* art window */}
      <div
        className={[
          'relative mx-1.5 rounded-md overflow-hidden border border-black/50',
          tiny ? 'flex-[1.15] min-h-0' : 'flex-[1.4] min-h-[38%]',
          artBg(card),
        ].join(' ')}
      >
        <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><path d=%22M0 20 Q10 0 20 20 T40 20%22 stroke=%22%23fff%22 stroke-opacity=%220.08%22 fill=%22none%22/></svg>')]" />
        <div
          className={[
            'absolute inset-0 flex items-center justify-center',
            tiny ? 'text-2xl' : size === 'inspect' ? 'text-6xl' : 'text-3xl',
            'drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]',
          ].join(' ')}
        >
          {artGlyph(card)}
        </div>
        {card.rarity === 'apex' && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.35),transparent_55%)]" />
        )}
      </div>

      {/* ability */}
      <div
        className={[
          'mx-1.5 mt-1 mb-0.5 rounded bg-black/55 border border-white/5 px-1 py-0.5',
          tiny ? 'min-h-[1.6rem]' : 'min-h-[2.1rem]',
        ].join(' ')}
      >
        <p
          className={[
            'text-white/85 leading-snug',
            tiny ? 'text-[0.42rem] line-clamp-3' : size === 'inspect' ? 'text-[0.7rem] line-clamp-4' : 'text-[0.5rem] line-clamp-3',
          ].join(' ')}
        >
          {card.ability}
        </p>
      </div>

      {/* footer stats */}
      <div
        className={[
          'relative z-10 mt-auto flex items-center justify-between gap-0.5 px-1 pb-1 pt-0.5',
          'bg-gradient-to-t from-black/80 to-transparent',
        ].join(' ')}
      >
        {showStats ? (
          <>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className={tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'}>⚔️</span>
              <span className={['font-black text-rose-300', tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'].join(' ')}>
                {a}
              </span>
            </div>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className={tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'}>🛡️</span>
              <span className={['font-black text-sky-300', tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'].join(' ')}>
                {d}
              </span>
            </div>
            <div
              className={[
                'px-1 rounded font-black tracking-wide text-center truncate',
                card.rarity === 'apex'
                  ? 'text-amber-300 bg-amber-500/20'
                  : card.rarity === 'epic'
                    ? 'text-violet-300 bg-violet-500/20'
                    : card.rarity === 'rare'
                      ? 'text-sky-300 bg-sky-500/20'
                      : 'text-stone-300 bg-stone-500/20',
                tiny ? 'text-[0.38rem] max-w-[2.2rem]' : 'text-[0.48rem] max-w-[2.8rem]',
              ].join(' ')}
            >
              {RARITY_LABEL[card.rarity]}
            </div>
            <div className="flex items-center gap-0.5 min-w-0">
              <span className={tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'}>❤️</span>
              <span className={['font-black text-emerald-300', tiny ? 'text-[0.55rem]' : 'text-[0.7rem]'].join(' ')}>
                {h}
              </span>
            </div>
          </>
        ) : (
          <div className="w-full text-center">
            <span
              className={[
                'px-1.5 py-0.5 rounded font-black tracking-wide',
                card.rarity === 'apex' ? 'text-amber-300' : 'text-white/70',
                tiny ? 'text-[0.4rem]' : 'text-[0.55rem]',
              ].join(' ')}
            >
              {card.type.toUpperCase()} · {RARITY_LABEL[card.rarity]}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
