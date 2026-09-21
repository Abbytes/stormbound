import type { BoardBeast } from '../game/engine'
import { cardById } from '../data/cards'
import { CardFace } from './CardFace'

interface Props {
  beast: BoardBeast | null
  side: 'player' | 'enemy'
  droppable?: boolean
  selected?: boolean
  targetable?: boolean
  faceTarget?: boolean
  onTap?: () => void
  damageFlash?: number | null
}

export function BoardSlot({
  beast,
  side,
  droppable,
  selected,
  targetable,
  onTap,
  damageFlash,
}: Props) {
  if (beast) {
    const card = cardById(beast.cardId)
    const hurt = beast.hp < beast.maxHp
    const flashing = damageFlash != null && damageFlash > 0
    return (
      <div className="relative flex-1 min-w-0 aspect-[3/4.4] max-h-[9.5rem]">
        <CardFace
          card={card}
          size="board"
          selected={selected || beast.attacking}
          targetable={targetable}
          atk={beast.atk + beast.tempAtk}
          def={beast.def}
          hp={beast.hp}
          maxHp={beast.maxHp}
          onClick={onTap}
          className={[
            'w-full h-full',
            beast.attacking ? 'ring-2 ring-rose-400 -translate-y-1' : '',
            beast.huntMarked
              ? 'outline outline-2 outline-amber-400 outline-offset-1'
              : '',
            beast.guarding ? 'ring-2 ring-sky-400/80' : '',
            beast.ward ? 'brightness-110' : '',
            beast.attackedThisTurn ? 'opacity-80' : '',
            flashing
              ? 'ring-2 ring-rose-500 brightness-125 saturate-150'
              : hurt
                ? ''
                : '',
          ].join(' ')}
        />
        {flashing && (
          <div className="absolute inset-0 z-25 rounded-xl pointer-events-none bg-rose-600/45 animate-pulse shadow-[inset_0_0_24px_rgba(244,63,94,0.85)]" />
        )}
        <div className="absolute top-0.5 left-0.5 z-20 flex gap-0.5 flex-wrap max-w-[90%]">
          {beast.ward && (
            <span className="text-[0.4rem] px-1 rounded bg-sky-500/70 text-white font-bold">
              W
            </span>
          )}
          {beast.bonded && (
            <span className="text-[0.4rem] px-1 rounded bg-amber-500/70 text-white font-bold">
              B
            </span>
          )}
          {beast.guarding && (
            <span className="text-[0.4rem] px-1 rounded bg-sky-600/90 text-white font-bold">
              🛡
            </span>
          )}
          {beast.summonSick && side === 'player' && (
            <span className="text-[0.4rem] px-1 rounded bg-stone-600/80 text-white">
              💤
            </span>
          )}
        </div>
        {/* Persistent HP pip — current/max */}
        <div
          className={[
            'absolute bottom-1 right-1 z-20 flex items-center gap-0.5 px-1 py-0.5 rounded-md border',
            'bg-black/75 backdrop-blur-[2px]',
            hurt
              ? 'border-rose-400/70 text-rose-200'
              : 'border-emerald-400/40 text-emerald-200',
          ].join(' ')}
        >
          <span className="text-[0.55rem] leading-none">❤️</span>
          <span className="text-[0.58rem] font-black tabular-nums leading-none">
            {beast.hp}
            <span className="opacity-60 font-bold">/{beast.maxHp}</span>
          </span>
        </div>
        {flashing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-rose-300 drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] animate-bounce">
              -{damageFlash}
            </span>
          </div>
        )}
      </div>
    )
  }

  const label =
    side === 'enemy'
      ? targetable
        ? 'Strike Face'
        : 'Enemy Slot'
      : droppable
        ? 'SUMMON HERE'
        : 'Open Slot'

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={side === 'enemy' && !targetable && !droppable}
      className={[
        'relative flex-1 min-w-0 aspect-[3/4.4] max-h-[9.5rem] rounded-xl',
        'border-2 border-dashed flex flex-col items-center justify-center gap-1 transition',
        droppable
          ? 'border-orange-300 bg-orange-500/25 animate-pulse shadow-[0_0_28px_rgba(251,146,60,0.65)] scale-[1.03] z-10'
          : targetable
            ? 'border-rose-400/90 bg-rose-500/15 animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.4)]'
            : side === 'enemy'
              ? 'border-amber-800/50 bg-black/25'
              : 'border-amber-700/45 bg-black/20',
      ].join(' ')}
    >
      {droppable && (
        <span className="text-lg leading-none drop-shadow-[0_0_8px_rgba(251,146,60,0.9)]">
          ⚡
        </span>
      )}
      <span
        className={[
          'uppercase tracking-[0.12em] font-black px-1 text-center leading-tight',
          droppable
            ? 'text-[0.72rem] text-orange-100 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]'
            : 'text-[0.55rem] text-white/30 font-semibold',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}
