const cache = new Map<string, HTMLAudioElement>()

const FILES: Record<string, string> = {
  page_turn: '/audio/page_turn.wav',
  pack_page: '/audio/pack_page.wav',
  dawn_chime: '/audio/dawn_chime.wav',
  inspect_chime: '/audio/inspect_chime.wav',
  dawn_horn: '/audio/dawn_horn.wav',
  iron_clink: '/audio/iron_clink.wav',
  bond: '/audio/bond.wav',
  pack_howl: '/audio/pack_howl.wav',
  surge_bolt: '/audio/surge_bolt.wav',
  apex_kill: '/audio/apex_kill.wav',
}

export type SfxName = keyof typeof FILES

export function playSfx(name: SfxName, volume = 0.55): void {
  try {
    let base = cache.get(name)
    if (!base) {
      base = new Audio(FILES[name])
      cache.set(name, base)
    }
    const a = base.cloneNode(true) as HTMLAudioElement
    a.volume = volume
    void a.play().catch(() => {})
  } catch {
    /* ignore autoplay blocks */
  }
}
