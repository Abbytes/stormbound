interface Props {
  title: string
  blurb: string
}

export function StubScreen({ title, blurb }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3 bg-[#0a0a0c]">
      <div className="text-4xl">🛠️</div>
      <h1 className="text-2xl font-black text-white">{title}</h1>
      <p className="text-sm text-white/55 max-w-xs leading-relaxed">{blurb}</p>
      <p className="text-[0.65rem] text-orange-300/70 uppercase tracking-widest mt-2">Coming soon</p>
    </div>
  )
}
