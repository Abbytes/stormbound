import { cardById } from '../data/cards'
import { STAGE_LABEL, RARITY_GEMS, type CardDef } from '../types/cards'
import { EnergyCostIcons } from './EnergyPips'

const base = () => import.meta.env.BASE_URL || '/'

export function cardArtSrc(card: CardDef): string {
  return `${base()}${card.art}`
}

export function MiniCard({
  cardId,
  selected,
  onClick,
  dimmed,
}: {
  cardId: string
  selected?: boolean
  onClick?: () => void
  dimmed?: boolean
}) {
  const card = cardById(cardId)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 w-[4.4rem] h-[6.2rem] rounded-xl overflow-hidden border-2 transition-transform ${
        selected
          ? 'border-amber-300 -translate-y-3 shadow-[0_0_16px_rgba(251,191,36,0.55)]'
          : 'border-white/25'
      } ${dimmed ? 'opacity-50' : ''}`}
    >
      <img
        src={cardArtSrc(card)}
        alt={card.name}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1">
        <div className="text-[8px] font-bold leading-tight truncate">{card.name}</div>
        <div className="text-[8px] text-rose-300 font-semibold">HP {card.hp}</div>
      </div>
      {card.stage === 'apex' && (
        <div className="absolute top-0.5 right-0.5 text-[8px] font-black text-amber-300 bg-black/50 px-1 rounded">
          EX
        </div>
      )}
    </button>
  )
}

export function BoardMonCard({
  cardId,
  hp,
  maxHp,
  energy,
  glow,
  small,
  onClick,
  label,
}: {
  cardId: string
  hp: number
  maxHp: number
  energy: number
  glow?: boolean
  small?: boolean
  onClick?: () => void
  label?: string
}) {
  const card = cardById(cardId)
  const w = small ? 'w-[3.6rem] h-[5rem]' : 'w-[5.5rem] h-[7.6rem]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${w} rounded-2xl overflow-hidden border-2 transition ${
        glow
          ? 'border-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.65)] scale-105'
          : 'border-white/30'
      } bg-black/40`}
    >
      <img
        src={cardArtSrc(card)}
        alt={card.name}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute top-0.5 left-0.5 right-0.5 flex justify-between items-start">
        <span className="text-[8px] font-bold bg-black/55 px-1 rounded text-white/90">
          {STAGE_LABEL[card.stage]}
        </span>
        <span className="text-[9px] font-black text-rose-200 bg-black/55 px-1 rounded">
          {hp}/{maxHp}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-4 pb-1 px-1">
        <div className={`font-bold leading-tight truncate ${small ? 'text-[8px]' : 'text-[10px]'}`}>
          {card.name}
        </div>
        <div className="flex justify-center mt-0.5">
          {Array.from({ length: Math.min(energy, 4) }).map((_, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-amber-400 text-[7px] flex items-center justify-center -ml-0.5 first:ml-0 border border-amber-200"
            >
              ⚡
            </span>
          ))}
          {energy > 4 && (
            <span className="text-[8px] text-amber-200 ml-0.5">+{energy - 4}</span>
          )}
        </div>
      </div>
      {label && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/70 whitespace-nowrap">
          {label}
        </div>
      )}
    </button>
  )
}

export function InspectCard({
  card,
  onClose,
}: {
  card: CardDef
  onClose: () => void
}) {
  const gems = RARITY_GEMS[card.rarity]
  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-b from-[#1a1520] to-[#0a0a0e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] max-h-[52vh]">
          <img
            src={cardArtSrc(card)}
            alt={card.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-transparent to-black/30" />
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <span className="text-xs font-bold bg-black/50 px-2 py-1 rounded-full">
              {STAGE_LABEL[card.stage]}
              {card.evoFrom ? ` · Evolves from ${cardById(card.evoFrom).name}` : ''}
            </span>
            <span className="text-sm font-black text-rose-300 bg-black/50 px-2 py-1 rounded-full">
              HP {card.hp}
            </span>
          </div>
        </div>
        <div className="p-4 -mt-8 relative space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-2xl font-black tracking-tight">{card.name}</h2>
            <div className="flex gap-0.5">
              {Array.from({ length: gems }).map((_, i) => (
                <span key={i} className="text-amber-300 text-sm">
                  ◆
                </span>
              ))}
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            {card.faction === 'dawn' ? 'Dawnpack' : 'Pack of the Dead'} · {card.rarity}
            {card.koPoints === 2 ? ' · KO = 2 pts' : ''}
          </div>

          {card.ability && (
            <div className="rounded-xl bg-violet-500/15 border border-violet-400/30 p-3">
              <div className="text-xs font-bold text-violet-200 mb-0.5">
                Ability: {card.ability.name}
              </div>
              <p className="text-xs text-white/75 leading-snug">{card.ability.description}</p>
            </div>
          )}

          <div className="space-y-2">
            {card.attacks.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <EnergyCostIcons cost={a.energyCost} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{a.name}</div>
                    {a.note && (
                      <div className="text-[10px] text-amber-200/80 truncate">{a.note}</div>
                    )}
                  </div>
                </div>
                <div className="text-lg font-black text-rose-200 tabular-nums">{a.damage}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-white/60 pt-1">
            <span>
              Weakness:{' '}
              <span className="text-rose-300 font-semibold">
                {card.weaknessFaction === 'dawn' ? 'Dawnpack' : 'Pack'} +20
              </span>
            </span>
            <span>
              Retreat: <span className="text-cyan-300 font-semibold">Free</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-1 py-3 rounded-2xl bg-white/10 border border-white/15 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
