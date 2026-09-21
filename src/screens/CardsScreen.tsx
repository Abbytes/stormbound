import { useMemo, useState } from 'react'
import { ALL_OWNED_IDS, cardById } from '../data/cards'
import { InspectCard, MiniCard } from '../components/CardFace'
import { playSfx } from '../game/audio'

export function CardsScreen() {
  const ids = useMemo(() => ALL_OWNED_IDS, [])
  const [index, setIndex] = useState(0)
  const [inspect, setInspect] = useState(false)
  const card = cardById(ids[index])

  const swipe = (dir: -1 | 1) => {
    playSfx('page_turn', 0.4)
    setIndex((i) => (i + dir + ids.length) % ids.length)
    setInspect(false)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-storm-home overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-black">Cards</h1>
        <span className="text-xs text-white/45">
          {index + 1}/{ids.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 relative">
        <button
          type="button"
          className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/15"
          onClick={() => swipe(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 border border-white/15"
          onClick={() => swipe(1)}
        >
          ›
        </button>

        <button
          type="button"
          onClick={() => {
            playSfx('inspect_chime', 0.45)
            setInspect(true)
          }}
          className="w-[14rem] h-[19.5rem] rounded-3xl overflow-hidden border-2 border-amber-300/40 shadow-[0_0_28px_rgba(251,191,36,0.25)] relative"
        >
          <img
            src={`${import.meta.env.BASE_URL}${card.art}`}
            alt={card.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
            <div className="text-lg font-black">{card.name}</div>
            <div className="text-xs text-rose-300 font-bold">HP {card.hp}</div>
          </div>
        </button>
        <p className="mt-3 text-[11px] text-white/45">Tap card to inspect · swipe arrows</p>
      </div>

      <div className="shrink-0 px-3 pb-3 overflow-x-auto flex gap-2">
        {ids.map((id, i) => (
          <MiniCard
            key={`${id}-${i}`}
            cardId={id}
            selected={i === index}
            onClick={() => {
              playSfx('page_turn', 0.3)
              setIndex(i)
            }}
          />
        ))}
      </div>

      {inspect && <InspectCard card={card} onClose={() => setInspect(false)} />}
    </div>
  )
}
