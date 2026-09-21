export type NavTab = 'home' | 'battle' | 'cards'

const TABS: { id: NavTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'battle', label: 'Battle', icon: '⚔' },
  { id: 'cards', label: 'Cards', icon: '◈' },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: NavTab
  onChange: (t: NavTab) => void
}) {
  return (
    <nav className="shrink-0 border-t border-white/10 bg-[#0c0c10]/95 backdrop-blur-md">
      <div className="flex max-w-lg mx-auto">
        {TABS.map((t) => {
          const on = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-semibold tracking-wide ${
                on ? 'text-amber-300' : 'text-white/45'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
