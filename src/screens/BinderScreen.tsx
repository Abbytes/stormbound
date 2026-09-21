import { useState } from 'react'
import { BINDER_PAGES, RELIC_STORM_PAGE_IDS, cardById } from '../data/cards'
import { CardFace } from '../components/CardFace'
import { InspectOverlay, openInspect } from '../components/InspectOverlay'
import type { CardDef } from '../types/cards'
import { playSfx } from '../game/audio'

interface Props {
  onBack: () => void
}

const PAGES = [
  ...BINDER_PAGES,
  {
    title: 'Relics & Storm',
    faction: 'neutral' as const,
    ids: RELIC_STORM_PAGE_IDS,
  },
]

export function BinderScreen({ onBack }: Props) {
  const [page, setPage] = useState(0)
  const [inspect, setInspect] = useState<CardDef | null>(null)
  const [flip, setFlip] = useState(false)
  const current = PAGES[page]

  const go = (dir: -1 | 1) => {
    const next = page + dir
    if (next < 0 || next >= PAGES.length) return
    setFlip(true)
    const dest = PAGES[next]
    if (dest.faction === 'pack') playSfx('pack_page')
    else if (dest.faction === 'dawn') playSfx('dawn_chime')
    else playSfx('page_turn')
    setTimeout(() => {
      setPage(next)
      setFlip(false)
    }, 180)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#1a120c] text-white">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-2 rounded-xl bg-white/10 text-sm font-semibold"
        >
          ← Home
        </button>
        <div className="text-center">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-amber-200/70">
            Collection Binder
          </div>
          <div className="font-bold">{current.title}</div>
        </div>
        <div className="text-xs text-white/40 w-14 text-right">
          {page + 1}/{PAGES.length}
        </div>
      </header>

      <div className="flex-1 px-3 pb-4 flex flex-col">
        <div
          className={[
            'flex-1 rounded-3xl border-4 border-amber-900/60 bg-gradient-to-br from-amber-950/90 via-[#2a1c12] to-stone-950',
            'shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] p-3 relative overflow-hidden transition-transform duration-200',
            flip ? 'scale-[0.97] opacity-70' : '',
            current.faction === 'dawn'
              ? 'ring-1 ring-cyan-400/30'
              : current.faction === 'pack'
                ? 'ring-1 ring-violet-400/30'
                : 'ring-1 ring-stone-400/20',
          ].join(' ')}
        >
          {/* binder spine */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-800/80 to-transparent" />
          <div className="grid grid-cols-2 gap-2.5 h-full content-start pl-2">
            {current.ids.map((id) => {
              const card = cardById(id)
              return (
                <div key={id} className="flex justify-center">
                  <CardFace
                    card={card}
                    size="md"
                    onClick={() => openInspect(card, setInspect)}
                  />
                </div>
              )
            })}
          </div>
          <p className="absolute bottom-2 right-3 text-[0.55rem] text-white/30 italic">
            Tap a card to inspect
          </p>
        </div>

        <div className="flex gap-3 mt-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => go(-1)}
            className="flex-1 py-3 rounded-2xl bg-white/10 font-bold disabled:opacity-30"
          >
            ◀ Prev
          </button>
          <button
            type="button"
            disabled={page === PAGES.length - 1}
            onClick={() => go(1)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-violet-600 font-bold disabled:opacity-30"
          >
            Next ▶
          </button>
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {PAGES.map((p, i) => (
            <button
              key={p.title}
              type="button"
              aria-label={p.title}
              onClick={() => {
                if (i === page) return
                setPage(i)
                if (PAGES[i].faction === 'pack') playSfx('pack_page')
                else if (PAGES[i].faction === 'dawn') playSfx('dawn_chime')
                else playSfx('page_turn')
              }}
              className={[
                'w-2 h-2 rounded-full transition',
                i === page ? 'bg-amber-300 w-4' : 'bg-white/25',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {inspect && <InspectOverlay card={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}
