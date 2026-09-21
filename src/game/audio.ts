const cache = new Map<string, HTMLAudioElement>()

const base = import.meta.env.BASE_URL || '/'

/** Pocket kit preferred; legacy files remain as fallbacks. */
const FILES: Record<string, string> = {
  place_card: `${base}audio/pocket/place_card.wav`,
  energy_attach: `${base}audio/pocket/energy_attach.wav`,
  evolve: `${base}audio/pocket/evolve.wav`,
  attack_hit: `${base}audio/pocket/attack_hit.wav`,
  surge_bolt: `${base}audio/pocket/surge_bolt.wav`,
  ko_basic: `${base}audio/pocket/ko_basic.wav`,
  ko_apex: `${base}audio/pocket/ko_apex.wav`,
  point_ding: `${base}audio/pocket/point_ding.wav`,
  win_sting: `${base}audio/pocket/win_sting.wav`,
  pack_howl: `${base}audio/pocket/pack_howl.wav`,
  page_turn: `${base}audio/pocket/page_turn.wav`,
  inspect_chime: `${base}audio/pocket/inspect_chime.wav`,
  // legacy aliases
  iron_clink: `${base}audio/pocket/place_card.wav`,
  dawn_chime: `${base}audio/pocket/energy_attach.wav`,
  dawn_horn: `${base}audio/pocket/win_sting.wav`,
  apex_kill: `${base}audio/pocket/ko_apex.wav`,
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
