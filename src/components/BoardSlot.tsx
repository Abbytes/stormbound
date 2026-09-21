import type { BoardBeast } from '../game/engine'
import { cardById } from '../data/cards'
import { CardFace } from './CardFace'

interface Props {
  beast: BoardBeast | null
  side: 'player' | 'enemy'
  droppable?: boolean
  selected?: boolean
  onTap?: () => void
}

export function BoardSlot({ beast, side, droppable, selected, onTap }: Props) {
  if (beast) {
    const card = cardById(beast.cardId)
    return (
      <div className="relative flex-1 min-w-0 aspect-[3/4.4] max-h-[9.5rem]">
        <CardFace
          card={card}
          size="board"
          selected={selected || beast.attacking}
          atk={beast.atk + beast.tempAtk}
          def={beast.def}
          hp={beast.hp}
          onClick={onTap}
          className={[
            'w-full h-full',
            beast.attacking ? 'ring-2 ring-rose-400 -translate-y-1' : '',
            beast.huntMarked ? 'outline outline-2 outline-amber-400 outline-offset-1' : '',
            beast.ward ? 'brightness-110' : '',
          ].join(' ')}
        />
        {(beast.summonSick || beast.bonded || beast.ward) && (
          <div className="absolute top-0.5 left-0.5 z-20 flex gap-0.5 flex-wrap max-w-[90%]">
            {beast.ward && (
              <span className="text-[0.4rem] px-1 rounded bg-sky-500/70 text-white font-bold">W</span>
            )}
            {beast.bonded && (
              <span className="text-[0.4rem] px-1 rounded bg-amber-500/70 text-white font-bold">B</span>
            )}
            {beast.summonSick && side === 'player' && (
              <span className="text-[0.4rem] px-1 rounded bg-stone-600/80 text-white">💤</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const label = side === 'enemy' ? 'Enemy Slot' : droppable ? 'Play Here' : 'Open Slot'

  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        'relative flex-1 min-w-0 aspect-[3/4.4] max-h-[9.5rem] rounded-xl',
        'border-2 border-dashed flex items-center justify-center transition',
        droppable
          ? 'border-orange-400/80 bg-orange-500/10 animate-pulse shadow-[0_0_16px_rgba(251,146,60,0.35)]'
          : side === 'enemy'
            ? 'border-amber-800/50 bg-black/25'
            : 'border-amber-700/45 bg-black/20',
      ].join(' ')}
    >
      <span className="text-[0.55rem] uppercase tracking-[0.12em] text-white/30 font-semibold px-1 text-center">
        {label}
      </span>
    </button>
  )
}
