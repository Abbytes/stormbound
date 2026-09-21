export type NavTab = 'home' | 'battle' | 'cards' | 'deck' | 'shop'

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏛️' },
  { id: 'battle', label: 'Battle', icon: '⚔️' },
  { id: 'cards', label: 'Cards', icon: '📖' },
  { id: 'deck', label: 'Deck', icon: '🛡️' },
  { id: 'shop', label: 'Shop', icon: '🎁' },
]

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="shrink-0 border-t border-white/10 bg-[#0c0c0e]/95 backdrop-blur-md px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {TABS.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition',
                on ? 'text-orange-400' : 'text-white/45 hover:text-white/70',
              ].join(' ')}
            >
              <span
                className={[
                  'text-lg leading-none',
                  on ? 'drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]' : '',
                ].join(' ')}
              >
                {t.icon}
              </span>
              <span
                className={[
                  'text-[0.6rem] font-semibold tracking-wide',
                  on ? 'text-orange-300' : '',
                ].join(' ')}
              >
                {t.label}
              </span>
              {on && (
                <span className="w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
