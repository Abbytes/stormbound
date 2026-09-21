export function HomeScreen({
  onPlay,
  onCards,
}: {
  onPlay: () => void
  onCards: () => void
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-storm-home">
      <div className="px-5 pt-10 pb-6 flex flex-col min-h-full">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase bg-amber-500/15 text-amber-200 border border-amber-400/30 mb-3">
            Pocket Duel
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-amber-100 via-orange-200 to-violet-300 bg-clip-text text-transparent">
            Stormbound
          </h1>
          <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-xs mx-auto">
            First to 3 points. Active Spot · Bench · Energy · Evolve.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 mb-4">
          <div className="text-xs font-bold text-amber-200/90 mb-1">Dawnpack vs Pack AI</div>
          <p className="text-[11px] text-white/50 leading-snug mb-3">
            Tutorial first match. Put a Basic in Active, Start Battle, attach ⚡, attack.
          </p>
          <button
            type="button"
            onClick={onPlay}
            className="w-full py-3.5 rounded-2xl font-black text-base bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-[0_0_24px_rgba(251,146,60,0.35)]"
          >
            Play
          </button>
        </div>

        <button
          type="button"
          onClick={onCards}
          className="w-full py-3 rounded-2xl font-bold text-sm bg-white/8 border border-white/12 text-white/85"
        >
          Cards — Collection
        </button>

        <div className="mt-auto pt-8 text-center text-[10px] text-white/30">
          KO Basic/Stage = 1 · Apex = 2 · Weakness +20
        </div>
      </div>
    </div>
  )
}
