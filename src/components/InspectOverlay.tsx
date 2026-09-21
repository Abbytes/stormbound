import type { CardDef } from '../types/cards'
import { KEYWORD_HELP } from '../types/cards'
import { CardFace } from './CardFace'
import { playSfx } from '../game/audio'

interface Props {
  card: CardDef
  onClose: () => void
}

export function InspectOverlay({ card, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="w-full max-w-sm bg-[#14110e]/95 border border-orange-500/30 rounded-3xl p-5 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <CardFace card={card} size="inspect" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-white/50">
              {card.faction} · {card.type}
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{card.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[0.65rem] text-cyan-200 capitalize">
                Cost {card.cost}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[0.65rem] text-amber-200 capitalize">
                {card.rarity}
              </span>
              {card.type === 'beast' && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[0.65rem] font-mono text-white">
                  {card.atk}/{card.def}/{card.hp}
                </span>
              )}
            </div>
            <p className="text-sm text-white/80 leading-snug">{card.ability}</p>
            <div className="flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        {card.keywords.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
            {card.keywords.map((k) => (
              <div key={k} className="text-xs">
                <span className="font-bold text-amber-300 uppercase">{k}</span>
                <span className="text-white/60"> — {KEYWORD_HELP[k]}</span>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-white font-bold"
          onClick={() => {
            playSfx('inspect_chime', 0.3)
            onClose()
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function openInspect(card: CardDef, set: (c: CardDef | null) => void) {
  playSfx('inspect_chime')
  set(card)
}
