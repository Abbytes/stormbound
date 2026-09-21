interface Props {
  onPlay: (faction: 'dawn' | 'pack') => void
  onBinder: () => void
}

export function HomeScreen({ onPlay, onBinder }: Props) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-between px-5 py-8 bg-storm-home text-white">
      <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[0.65rem] uppercase tracking-[0.25em] text-cyan-200/80">
            Mobile TCG · Tutorial
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent drop-shadow">
            Stormbound
          </h1>
          <p className="text-sm text-white/60 max-w-xs mx-auto leading-relaxed">
            Dawnpack vs Pack of the Dead. Armored beasts, lightning, and a ruined-keep floor.
          </p>
        </div>

        <div className="w-full space-y-3 mt-4">
          <button
            type="button"
            onClick={() => onPlay('dawn')}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-cyan-500 to-sky-600 shadow-lg shadow-cyan-500/30 active:scale-[0.98] transition"
          >
            Play Tutorial — Dawnpack
          </button>
          <button
            type="button"
            onClick={() => onPlay('pack')}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-700 shadow-lg shadow-violet-500/30 active:scale-[0.98] transition"
          >
            Play Tutorial — Pack of the Dead
          </button>
          <button
            type="button"
            onClick={onBinder}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-white/10 border border-white/15 active:scale-[0.98] transition"
          >
            Open Binder
          </button>
        </div>
      </div>
      <p className="text-[0.65rem] text-white/35 text-center">
        Ab Creative World · Stormbound MVP · Client-only
      </p>
    </div>
  )
}
