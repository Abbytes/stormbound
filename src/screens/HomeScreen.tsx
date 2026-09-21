interface Props {
  onPlay: (faction: 'dawn' | 'pack') => void
  onBinder: () => void
}

export function HomeScreen({ onPlay, onBinder }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-between px-5 py-6 bg-storm-home text-white min-h-0 overflow-y-auto">
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center gap-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-400/30 text-[0.65rem] uppercase tracking-[0.25em] text-orange-200/90">
            Dark Fantasy TCG
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-amber-200 via-orange-300 to-violet-300 bg-clip-text text-transparent drop-shadow">
            Stormbound
          </h1>
          <p className="text-sm text-white/60 max-w-xs mx-auto leading-relaxed">
            Dawnpack vs Pack of the Dead. Armored beasts, lightning, and Apex power.
          </p>
        </div>

        <div className="w-full space-y-3 mt-2">
          <button
            type="button"
            onClick={() => onPlay('dawn')}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/30 active:scale-[0.98] transition"
          >
            Play — Dawnpack
          </button>
          <button
            type="button"
            onClick={() => onPlay('pack')}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-700 shadow-lg shadow-violet-500/30 active:scale-[0.98] transition"
          >
            Play — Pack of the Dead
          </button>
          <button
            type="button"
            onClick={onBinder}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-white/10 border border-amber-500/30 active:scale-[0.98] transition"
          >
            Open Binder
          </button>
        </div>
      </div>
      <p className="text-[0.65rem] text-white/35 text-center pb-1">
        Ab Creative · Stormbound · Portrait TCG
      </p>
    </div>
  )
}
