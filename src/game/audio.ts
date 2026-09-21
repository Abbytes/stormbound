const cache = new Map<string, HTMLAudioElement>()

const base = import.meta.env.BASE_URL || '/'

const FILES: Record<string, string> = {
  page_turn: `${base}audio/page_turn.wav`,
  pack_page: `${base}audio/pack_page.wav`,
  dawn_chime: `${base}audio/dawn_chime.wav`,
  inspect_chime: `${base}audio/inspect_chime.wav`,
  dawn_horn: `${base}audio/dawn_horn.wav`,
  iron_clink: `${base}audio/iron_clink.wav`,
  bond: `${base}audio/bond.wav`,
  pack_howl: `${base}audio/pack_howl.wav`,
  surge_bolt: `${base}audio/surge_bolt.wav`,
  apex_kill: `${base}audio/apex_kill.wav`,
}

export type SfxName = keyof typeof FILES

export function playSfx(name: SfxName, volume = 0.55): void {
  try {
    let audio = cache.get(name)
    if (!audio) {
      audio = new Audio(FILES[name])
      cache.set(name, audio)
    }
    const a = audio.cloneNode(true) as HTMLAudioElement
    a.volume = volume
    void a.play().catch(() => {})
  } catch {
    /* ignore autoplay blocks */
  }
}
