import {
  DAWNPACK_DECK,
  PACK_DECK,
  cardById,
} from '../data/cards'
import type { AttackDef, CardDef } from '../types/cards'

export type Side = 'player' | 'enemy'
export type Phase =
  | 'setup'
  | 'main'
  | 'promote'
  | 'gameover'

export type UiMode =
  | 'idle'
  | 'placeBasic'
  | 'attachEnergy'
  | 'retreat'
  | 'attackPick'
  | 'promotePick'

export interface BattleMon {
  uid: string
  cardId: string
  hp: number
  maxHp: number
  energy: number
  /** Damage taken (maxHp - hp) kept on evolve */
  damage: number
  /** Ward: first hit this turn reduced to 0 */
  wardReady: boolean
  justPlayed: boolean
  /** Evolution chain card ids from basic up */
  evoStack: string[]
}

export interface SideState {
  active: BattleMon | null
  bench: (BattleMon | null)[]
  hand: string[]
  deck: string[]
  discard: string[]
  points: number
}

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'damage' | 'ko' | 'win' | 'ability'
}

export interface GameState {
  phase: Phase
  turn: number
  active: Side
  player: SideState
  enemy: SideState
  /** Whose Active was KO'd and needs promote */
  promoteSide: Side | null
  energyAttachedThisTurn: boolean
  retreatedThisTurn: boolean
  attackedThisTurn: boolean
  selectedHand: number | null
  selectedAttack: number | null
  uiMode: UiMode
  winner: Side | null
  winReason: string
  log: string[]
  toasts: Toast[]
  toastSeq: number
  tutorialStep: number
  firstMatch: boolean
  setupStarted: boolean
  sfxQueue: string[]
}

let uidCounter = 0
const uid = () => `m${++uidCounter}`

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cloneSide(s: SideState): SideState {
  return {
    ...s,
    hand: [...s.hand],
    deck: [...s.deck],
    discard: [...s.discard],
    bench: s.bench.map((b) => (b ? { ...b, evoStack: [...b.evoStack] } : null)),
    active: s.active
      ? { ...s.active, evoStack: [...s.active.evoStack] }
      : null,
  }
}

function cloneState(g: GameState): GameState {
  return {
    ...g,
    player: cloneSide(g.player),
    enemy: cloneSide(g.enemy),
    log: [...g.log],
    toasts: [...g.toasts],
    sfxQueue: [...g.sfxQueue],
  }
}

function pushLog(g: GameState, msg: string) {
  g.log = [...g.log.slice(-40), msg]
}


function enqueueSfx(g: GameState, name: string) {
  g.sfxQueue = [...g.sfxQueue, name]
}

function toast(g: GameState, text: string, kind: Toast['kind'] = 'info') {
  g.toastSeq += 1
  g.toasts = [...g.toasts.slice(-4), { id: g.toastSeq, text, kind }]
}

function makeMon(cardId: string): BattleMon {
  const c = cardById(cardId)
  return {
    uid: uid(),
    cardId,
    hp: c.hp,
    maxHp: c.hp,
    energy: 0,
    damage: 0,
    wardReady: c.ability?.trigger === 'ward',
    justPlayed: true,
    evoStack: [cardId],
  }
}

function sideOf(g: GameState, side: Side): SideState {
  return side === 'player' ? g.player : g.enemy
}

function setSide(g: GameState, side: Side, s: SideState) {
  if (side === 'player') g.player = s
  else g.enemy = s
}

function draw(g: GameState, side: Side, n = 1) {
  const s = sideOf(g, side)
  for (let i = 0; i < n; i++) {
    if (s.deck.length === 0) break
    const [top, ...rest] = s.deck
    s.hand = [...s.hand, top]
    s.deck = rest
  }
}

function ensureOpeningBasic(hand: string[], deck: string[]): {
  hand: string[]
  deck: string[]
} {
  // Mulligan-lite: if no Basic in opening hand, dig until we have one
  let h = [...hand]
  let d = [...deck]
  const hasBasic = () => h.some((id) => cardById(id).stage === 'basic')
  let guard = 40
  while (!hasBasic() && d.length > 0 && guard-- > 0) {
    // put hand back, reshuffle, redraw 5
    d = shuffle([...d, ...h])
    h = d.splice(0, 5)
  }
  return { hand: h, deck: d }
}

const FIRST_MATCH_KEY = 'stormbound_pocket_played'

export function createGame(firstMatch?: boolean): GameState {
  const played =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(FIRST_MATCH_KEY) === '1'
  const isFirst = firstMatch ?? !played

  let pDeck = shuffle([...DAWNPACK_DECK])
  let eDeck = shuffle([...PACK_DECK])
  let pHand = pDeck.splice(0, 5)
  let eHand = eDeck.splice(0, 5)
  ;({ hand: pHand, deck: pDeck } = ensureOpeningBasic(pHand, pDeck))
  ;({ hand: eHand, deck: eDeck } = ensureOpeningBasic(eHand, eDeck))

  const g: GameState = {
    phase: 'setup',
    turn: 0,
    active: 'player',
    player: {
      active: null,
      bench: [null, null, null],
      hand: pHand,
      deck: pDeck,
      discard: [],
      points: 0,
    },
    enemy: {
      active: null,
      bench: [null, null, null],
      hand: eHand,
      deck: eDeck,
      discard: [],
      points: 0,
    },
    promoteSide: null,
    energyAttachedThisTurn: false,
    retreatedThisTurn: false,
    attackedThisTurn: false,
    selectedHand: null,
    selectedAttack: null,
    uiMode: 'placeBasic',
    winner: null,
    winReason: '',
    log: ['Setup — put a Basic into your Active Spot.'],
    toasts: [],
    toastSeq: 0,
    tutorialStep: isFirst ? 0 : 99,
    firstMatch: isFirst,
    setupStarted: false,
    sfxQueue: [],
  }

  // AI auto-setup Active + optional bench
  aiSetup(g)
  return g
}

function aiSetup(g: GameState) {
  const basics = g.enemy.hand
    .map((id, i) => ({ id, i }))
    .filter((x) => cardById(x.id).stage === 'basic')
  if (basics.length === 0) return
  // Active = first basic
  const [first, ...rest] = basics
  const hand = [...g.enemy.hand]
  hand.splice(first.i, 1)
  g.enemy.active = makeMon(first.id)
  g.enemy.hand = hand
  // Bench up to 2 more
  let placed = 0
  for (const b of rest) {
    if (placed >= 2) break
    const idx = g.enemy.hand.indexOf(b.id)
    if (idx < 0) continue
    const slot = g.enemy.bench.findIndex((x) => x === null)
    if (slot < 0) break
    g.enemy.hand = g.enemy.hand.filter((_, i) => i !== idx)
    const bench = [...g.enemy.bench]
    bench[slot] = makeMon(b.id)
    g.enemy.bench = bench
    placed++
  }
}

export function dismissToast(g: GameState, id: number): GameState {
  const n = cloneState(g)
  n.toasts = n.toasts.filter((t) => t.id !== id)
  return n
}

export function selectHand(g: GameState, index: number | null): GameState {
  const n = cloneState(g)
  n.selectedHand = index
  n.selectedAttack = null
  if (index !== null && (n.phase === 'setup' || n.phase === 'main')) {
    n.uiMode = 'placeBasic'
  }
  return n
}

export function advanceTutorial(g: GameState): GameState {
  const n = cloneState(g)
  n.tutorialStep += 1
  return n
}

/** Play Basic from hand to Active (setup/main) or empty Bench */
export function playBasicTo(
  g: GameState,
  target: 'active' | number,
): GameState {
  const n = cloneState(g)
  if (n.active !== 'player') return g
  if (n.selectedHand === null) return g
  const cardId = n.player.hand[n.selectedHand]
  if (!cardId) return g
  const def = cardById(cardId)
  if (def.stage !== 'basic') {
    toast(n, 'Only Basics can be played to Active/Bench', 'info')
    return n
  }

  if (target === 'active') {
    if (n.player.active) return g
    n.player.active = makeMon(cardId)
    n.player.hand = n.player.hand.filter((_, i) => i !== n.selectedHand)
    pushLog(n, `You set ${def.name} as Active.`)
    toast(n, `${def.name} → Active`, 'info')
    enqueueSfx(n, 'place_card')
    if (n.tutorialStep === 0) n.tutorialStep = 1
  } else {
    const slot = target
    if (slot < 0 || slot > 2) return g
    if (n.player.bench[slot]) return g
    if (!n.player.active && n.phase === 'setup') {
      // Prefer Active first in setup
      return g
    }
    const bench = [...n.player.bench]
    bench[slot] = makeMon(cardId)
    n.player.bench = bench
    n.player.hand = n.player.hand.filter((_, i) => i !== n.selectedHand)
    pushLog(n, `You benched ${def.name}.`)
    toast(n, `${def.name} → Bench`, 'info')
    enqueueSfx(n, 'place_card')
  }
  n.selectedHand = null
  n.uiMode = 'idle'
  return n
}

/** Evolve matching line onto Active or Bench mon */
export function evolveOnto(
  g: GameState,
  target: 'active' | number,
): GameState {
  const n = cloneState(g)
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.selectedHand === null) return g
  const evoId = n.player.hand[n.selectedHand]
  if (!evoId) return g
  const evo = cardById(evoId)
  if (!evo.evoFrom) return g

  const applyEvo = (mon: BattleMon): BattleMon | null => {
    if (mon.cardId !== evo.evoFrom) return null
    const next: BattleMon = {
      ...mon,
      cardId: evoId,
      maxHp: evo.hp,
      hp: Math.max(1, evo.hp - mon.damage),
      damage: mon.damage,
      wardReady: evo.ability?.trigger === 'ward' ? true : mon.wardReady,
      justPlayed: false,
      evoStack: [...mon.evoStack, evoId],
    }
    // Keep energy
    return next
  }

  let targetMon: BattleMon | null = null
  if (target === 'active') {
    if (!n.player.active) return g
    const next = applyEvo(n.player.active)
    if (!next) return g
    n.player.active = next
    targetMon = next
  } else {
    const mon = n.player.bench[target]
    if (!mon) return g
    const next = applyEvo(mon)
    if (!next) return g
    const bench = [...n.player.bench]
    bench[target] = next
    n.player.bench = bench
    targetMon = next
  }

  n.player.hand = n.player.hand.filter((_, i) => i !== n.selectedHand)
  n.selectedHand = null
  n.uiMode = 'idle'
  pushLog(n, `Evolved into ${evo.name}!`)
  toast(n, `Evolve → ${evo.name}`, 'ability')
  enqueueSfx(n, 'evolve')

  // On-evolve abilities
  if (evo.ability?.trigger === 'onEvolve' && targetMon) {
    if (evo.id === 'solar-wyvern') {
      targetMon.energy += 1
      if (target === 'active') n.player.active = { ...targetMon }
      else {
        const bench = [...n.player.bench]
        bench[target as number] = { ...targetMon }
        n.player.bench = bench
      }
      toast(n, 'Dawnflare: +1 Energy!', 'ability')
    }
    if (evo.id === 'howl-tyrant' && n.player.active) {
      const healed = Math.min(
        n.player.active.maxHp,
        n.player.active.hp + 20,
      )
      const delta = healed - n.player.active.hp
      n.player.active = {
        ...n.player.active,
        hp: healed,
        damage: Math.max(0, n.player.active.damage - delta),
      }
      toast(n, `Pack Howl: heal Active ${delta}!`, 'ability')
    }
  }

  return n
}

export function canEvolveOnto(
  g: GameState,
  handIndex: number,
  target: 'active' | number,
): boolean {
  const evoId = g.player.hand[handIndex]
  if (!evoId) return false
  const evo = cardById(evoId)
  if (!evo.evoFrom) return false
  const mon =
    target === 'active' ? g.player.active : g.player.bench[target]
  if (!mon) return false
  return mon.cardId === evo.evoFrom
}

export function canPlayBasicTo(
  g: GameState,
  handIndex: number,
  target: 'active' | number,
): boolean {
  const id = g.player.hand[handIndex]
  if (!id) return false
  if (cardById(id).stage !== 'basic') return false
  if (target === 'active') return !g.player.active
  return !g.player.bench[target]
}

export function startBattle(g: GameState): GameState {
  const n = cloneState(g)
  if (n.phase !== 'setup') return g
  if (!n.player.active) return g
  if (!n.enemy.active) aiSetup(n)
  if (!n.enemy.active) {
    // emergency: put any basic from deck
    const bi = n.enemy.deck.findIndex((id) => cardById(id).stage === 'basic')
    if (bi >= 0) {
      const id = n.enemy.deck[bi]
      n.enemy.deck = n.enemy.deck.filter((_, i) => i !== bi)
      n.enemy.active = makeMon(id)
    }
  }
  n.phase = 'main'
  n.turn = 1
  n.active = 'player'
  n.energyAttachedThisTurn = false
  n.retreatedThisTurn = false
  n.attackedThisTurn = false
  n.uiMode = 'idle'
  n.setupStarted = true
  // First player: no draw on turn 1 (Pocket style) — user said draw after first turn setup;
  // interpreting as: after setup, turn 1 starts without extra draw (already have 5).
  pushLog(n, 'Battle start! Your turn.')
  toast(n, 'Battle Start!', 'info')
  if (n.tutorialStep <= 1) n.tutorialStep = 2
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FIRST_MATCH_KEY, '1')
  }
  return n
}

export function attachEnergy(
  g: GameState,
  target: 'active' | number,
): GameState {
  const n = cloneState(g)
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.energyAttachedThisTurn) return g

  const apply = (mon: BattleMon): BattleMon => ({
    ...mon,
    energy: mon.energy + 1,
  })

  if (target === 'active') {
    if (!n.player.active) return g
    n.player.active = apply(n.player.active)
    pushLog(n, `Attached Energy to ${cardById(n.player.active.cardId).name}.`)
  } else {
    const mon = n.player.bench[target]
    if (!mon) return g
    const bench = [...n.player.bench]
    bench[target] = apply(mon)
    n.player.bench = bench
    pushLog(n, `Attached Energy to Bench ${cardById(mon.cardId).name}.`)
  }
  n.energyAttachedThisTurn = true
  n.uiMode = 'idle'
  toast(n, '+1 ⚡ Energy', 'info')
  enqueueSfx(n, 'energy_attach')
  if (n.tutorialStep === 2) n.tutorialStep = 3
  return n
}

export function beginAttachMode(g: GameState): GameState {
  const n = cloneState(g)
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.energyAttachedThisTurn) return g
  n.uiMode = 'attachEnergy'
  n.selectedHand = null
  return n
}

export function beginRetreatMode(g: GameState): GameState {
  const n = cloneState(g)
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.retreatedThisTurn) return g
  if (!n.player.active) return g
  if (!n.player.bench.some(Boolean)) return g
  n.uiMode = 'retreat'
  n.selectedHand = null
  return n
}

export function retreatToBench(g: GameState, benchIndex: number): GameState {
  const n = cloneState(g)
  if (n.uiMode !== 'retreat' && n.phase === 'main') {
    // allow direct
  }
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.retreatedThisTurn) return g
  if (!n.player.active) return g
  const incoming = n.player.bench[benchIndex]
  if (!incoming) return g
  const bench = [...n.player.bench]
  bench[benchIndex] = n.player.active
  n.player.active = incoming
  n.player.bench = bench
  n.retreatedThisTurn = true
  n.uiMode = 'idle'
  pushLog(
    n,
    `Retreated. Active is now ${cardById(incoming.cardId).name}.`,
  )
  toast(n, 'Retreat!', 'info')
  return n
}

function attackDamage(
  attacker: BattleMon,
  attack: AttackDef,
  defender: BattleMon,
): number {
  const atkDef = cardById(attacker.cardId)
  const defDef = cardById(defender.cardId)
  let dmg = attack.damage
  if (attack.surgeBonus && attacker.energy >= 2) {
    dmg += attack.surgeBonus
  }
  // Weakness: opposite faction +20
  if (atkDef.faction === defDef.weaknessFaction) {
    dmg += 20
  }
  return dmg
}

function applyDamage(
  g: GameState,
  defenderSide: Side,
  raw: number,
): { ko: boolean; dealt: number } {
  const s = sideOf(g, defenderSide)
  if (!s.active) return { ko: false, dealt: 0 }
  let dmg = raw
  if (s.active.wardReady && dmg > 0) {
    s.active = { ...s.active, wardReady: false }
    toast(g, 'Ward! Damage → 0', 'ability')
    pushLog(g, 'Ward negated the hit!')
    return { ko: false, dealt: 0 }
  }
  const hp = Math.max(0, s.active.hp - dmg)
  const damage = s.active.damage + (s.active.hp - hp)
  s.active = { ...s.active, hp, damage }
  setSide(g, defenderSide, s)
  return { ko: hp <= 0, dealt: dmg }
}

function discardMon(g: GameState, side: Side, mon: BattleMon) {
  const s = sideOf(g, side)
  s.discard = [...s.discard, ...mon.evoStack]
  setSide(g, side, s)
}

function scoreKo(g: GameState, scorer: Side, koCard: CardDef) {
  const s = sideOf(g, scorer)
  s.points += koCard.koPoints
  setSide(g, scorer, s)
  enqueueSfx(g, koCard.koPoints >= 2 ? 'ko_apex' : 'ko_basic')
  enqueueSfx(g, 'point_ding')
  toast(
    g,
    `KO! +${koCard.koPoints} pt${koCard.koPoints > 1 ? 's' : ''} (${s.points}/3)`,
    'ko',
  )
  pushLog(
    g,
    `${scorer === 'player' ? 'You' : 'Enemy'} scored ${koCard.koPoints} — now ${s.points}/3`,
  )
  if (s.points >= 3) {
    g.phase = 'gameover'
    g.winner = scorer
    g.winReason = `${scorer === 'player' ? 'You' : 'Enemy'} reached 3 points!`
    enqueueSfx(g, 'win_sting')
    toast(g, g.winReason, 'win')
  }
}

function beginPromote(g: GameState, side: Side) {
  const s = sideOf(g, side)
  const hasBench = s.bench.some(Boolean)
  if (!hasBench) {
    // Can't promote → opponent wins
    const winner: Side = side === 'player' ? 'enemy' : 'player'
    g.phase = 'gameover'
    g.winner = winner
    g.winReason = `${side === 'player' ? 'You have' : 'Enemy has'} no Bench to promote!`
    enqueueSfx(g, 'win_sting')
    toast(g, g.winReason, 'win')
    return
  }
  if (g.phase === 'gameover') return
  g.promoteSide = side
  g.phase = 'promote'
  if (side === 'enemy') {
    // AI auto-promote strongest remaining
    aiPromote(g)
  } else {
    g.uiMode = 'promotePick'
    toast(g, 'Choose a Bench beast to promote!', 'info')
  }
}

function aiPromote(g: GameState) {
  const s = g.enemy
  let best = -1
  let bestScore = -1
  s.bench.forEach((m, i) => {
    if (!m) return
    const score = m.hp + m.energy * 20 + cardById(m.cardId).hp
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  if (best < 0) return
  promoteFromBench(g, 'enemy', best)
}

export function promoteFromBench(
  g: GameState,
  side: Side,
  benchIndex: number,
): GameState {
  const n = g.phase === 'promote' && g.promoteSide === side ? g : cloneState(g)
  // Always clone if not already working on n carefully
  const state = n === g ? cloneState(g) : n
  const s = sideOf(state, side)
  const mon = s.bench[benchIndex]
  if (!mon) return g
  const bench = [...s.bench]
  bench[benchIndex] = null
  s.bench = bench
  s.active = { ...mon, wardReady: cardById(mon.cardId).ability?.trigger === 'ward' }
  setSide(state, side, s)
  state.promoteSide = null
  state.uiMode = 'idle'
  if (state.winner) {
    // already over
  } else if (state.phase === 'promote') {
    // Resume: if it was mid-turn after attack, end the attacker's turn
    state.phase = 'main'
    // After KO resolve, turn ends for the attacker
    const attacker: Side = side === 'player' ? 'enemy' : 'player'
    if (attacker === 'player') {
      // Player just KO'd — end their turn after promote
      return endTurnInternal(state)
    }
    // Enemy just KO'd player's active — continue enemy? Usually attack ends turn.
    // Enemy already attacked; finish enemy turn
    return endTurnInternal(state)
  }
  pushLog(
    state,
    `${side === 'player' ? 'You' : 'Enemy'} promoted ${cardById(mon.cardId).name}.`,
  )
  return state
}

export function playerPromote(g: GameState, benchIndex: number): GameState {
  if (g.phase !== 'promote' || g.promoteSide !== 'player') return g
  return promoteFromBench(g, 'player', benchIndex)
}

export function attackWith(
  g: GameState,
  attackIndex: number,
): GameState {
  const n = cloneState(g)
  if (n.phase !== 'main' || n.active !== 'player') return g
  if (n.attackedThisTurn) return g
  if (!n.player.active || !n.enemy.active) return g
  const atkMon = n.player.active
  const def = cardById(atkMon.cardId)
  const attack = def.attacks[attackIndex]
  if (!attack) return g
  if (atkMon.energy < attack.energyCost) return g
  if (atkMon.justPlayed && !def.swift) return g

  const raw = attackDamage(atkMon, attack, n.enemy.active)
  pushLog(n, `${def.name} used ${attack.name} for ${raw}!`)
  toast(n, `${attack.name} → ${raw}`, 'damage')
  enqueueSfx(n, attack.surgeBonus ? 'surge_bolt' : 'attack_hit')

  const { ko, dealt } = applyDamage(n, 'enemy', raw)
  void dealt
  n.attackedThisTurn = true
  n.player.active = { ...n.player.active!, justPlayed: false }
  if (n.tutorialStep === 3) n.tutorialStep = 4

  if (ko && n.enemy.active) {
    const koCard = cardById(n.enemy.active.cardId)
    discardMon(n, 'enemy', n.enemy.active)
    n.enemy.active = null
    scoreKo(n, 'player', koCard)
    if (n.winner) return n
    beginPromote(n, 'enemy')
    if (n.winner || n.promoteSide) return n
  }

  // Attack ends the turn
  return endTurnInternal(n)
}

function resetTurnFlags(g: GameState, side: Side) {
  g.energyAttachedThisTurn = false
  g.retreatedThisTurn = false
  g.attackedThisTurn = false
  const s = sideOf(g, side)
  if (s.active) {
    s.active = {
      ...s.active,
      justPlayed: false,
      wardReady:
        cardById(s.active.cardId).ability?.trigger === 'ward'
          ? true
          : s.active.wardReady,
    }
  }
  s.bench = s.bench.map((m) =>
    m
      ? {
          ...m,
          justPlayed: false,
          wardReady:
            cardById(m.cardId).ability?.trigger === 'ward' ? true : m.wardReady,
        }
      : null,
  )
  setSide(g, side, s)
}

function endTurnInternal(g: GameState): GameState {
  if (g.phase === 'gameover' || g.phase === 'promote') return g

  if (g.active === 'player') {
    g.active = 'enemy'
    g.uiMode = 'idle'
    g.selectedHand = null
    pushLog(g, "Enemy's turn…")
    // Run AI immediately (sync)
    return runAiTurn(g)
  }

  // Enemy finished → player turn
  g.turn += 1
  g.active = 'player'
  resetTurnFlags(g, 'player')
  draw(g, 'player', 1)
  pushLog(g, `Your turn ${g.turn}.`)
  toast(g, `Turn ${g.turn}`, 'info')
  g.uiMode = 'idle'
  return g
}

export function endTurn(g: GameState): GameState {
  if (g.phase !== 'main' || g.active !== 'player') return g
  if (g.attackedThisTurn) {
    // already ending via attack
  }
  const n = cloneState(g)
  return endTurnInternal(n)
}

function runAiTurn(g: GameState): GameState {
  resetTurnFlags(g, 'enemy')
  draw(g, 'enemy', 1)

  // 1) Play basics to bench
  for (let guard = 0; guard < 3; guard++) {
    const empty = g.enemy.bench.findIndex((b) => b === null)
    if (empty < 0) break
    const hi = g.enemy.hand.findIndex((id) => cardById(id).stage === 'basic')
    if (hi < 0) break
    const id = g.enemy.hand[hi]
    g.enemy.hand = g.enemy.hand.filter((_, i) => i !== hi)
    const bench = [...g.enemy.bench]
    bench[empty] = makeMon(id)
    g.enemy.bench = bench
    pushLog(g, `Enemy benched ${cardById(id).name}.`)
    enqueueSfx(g, 'place_card')
  }

  // 2) Evolve if possible (prefer Active)
  const tryEvo = (target: 'active' | number) => {
    const mon =
      target === 'active' ? g.enemy.active : g.enemy.bench[target]
    if (!mon) return false
    const hi = g.enemy.hand.findIndex((id) => {
      const c = cardById(id)
      return c.evoFrom === mon.cardId
    })
    if (hi < 0) return false
    const evoId = g.enemy.hand[hi]
    const evo = cardById(evoId)
    g.enemy.hand = g.enemy.hand.filter((_, i) => i !== hi)
    const next: BattleMon = {
      ...mon,
      cardId: evoId,
      maxHp: evo.hp,
      hp: Math.max(1, evo.hp - mon.damage),
      damage: mon.damage,
      justPlayed: false,
      wardReady: evo.ability?.trigger === 'ward',
      evoStack: [...mon.evoStack, evoId],
    }
    if (evo.id === 'solar-wyvern') next.energy += 1
    if (evo.id === 'howl-tyrant' && g.enemy.active) {
      const healed = Math.min(g.enemy.active.maxHp, g.enemy.active.hp + 20)
      const delta = healed - g.enemy.active.hp
      if (target === 'active') {
        next.hp = Math.min(evo.hp, next.hp + 20)
        next.damage = Math.max(0, next.damage - 20)
      } else {
        g.enemy.active = {
          ...g.enemy.active,
          hp: healed,
          damage: Math.max(0, g.enemy.active.damage - delta),
        }
      }
    }
    if (target === 'active') g.enemy.active = next
    else {
      const bench = [...g.enemy.bench]
      bench[target] = next
      g.enemy.bench = bench
    }
    pushLog(g, `Enemy evolved into ${evo.name}!`)
    toast(g, `Enemy → ${evo.name}`, 'ability')
    enqueueSfx(g, 'evolve')
    return true
  }
  tryEvo('active')
  for (let i = 0; i < 3; i++) tryEvo(i)

  // 3) Attach energy to Active (or bench if no active attacks affordable soon)
  if (g.enemy.active && !g.energyAttachedThisTurn) {
    g.enemy.active = {
      ...g.enemy.active,
      energy: g.enemy.active.energy + 1,
    }
    g.energyAttachedThisTurn = true
    pushLog(g, 'Enemy attached Energy.')
  }

  // 4) Optional retreat if Active can't attack and bench can
  // skip for MVP simplicity unless Active has 0 energy and bench has energy
  if (
    g.enemy.active &&
    g.enemy.active.energy === 0 &&
    !g.retreatedThisTurn
  ) {
    const bi = g.enemy.bench.findIndex((m) => m && m.energy >= 1)
    if (bi >= 0) {
      const bench = [...g.enemy.bench]
      const swap = bench[bi]!
      bench[bi] = g.enemy.active
      g.enemy.active = swap
      g.enemy.bench = bench
      g.retreatedThisTurn = true
      pushLog(g, 'Enemy retreated.')
    }
  }

  // 5) Attack if possible
  if (g.enemy.active && g.player.active && !g.attackedThisTurn) {
    const def = cardById(g.enemy.active.cardId)
    const usable = def.attacks
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => g.enemy.active!.energy >= a.energyCost)
      .filter(() => !g.enemy.active!.justPlayed || def.swift)
    if (usable.length > 0) {
      // Pick highest damage
      usable.sort(
        (x, y) =>
          attackDamage(g.enemy.active!, y.a, g.player.active!) -
          attackDamage(g.enemy.active!, x.a, g.player.active!),
      )
      const { a, i } = usable[0]
      void i
      const raw = attackDamage(g.enemy.active, a, g.player.active)
      pushLog(g, `Enemy ${def.name} used ${a.name} for ${raw}!`)
      toast(g, `Enemy ${a.name} → ${raw}`, 'damage')
      enqueueSfx(g, a.surgeBonus ? 'surge_bolt' : 'attack_hit')
      const { ko } = applyDamage(g, 'player', raw)
      g.attackedThisTurn = true
      g.enemy.active = { ...g.enemy.active, justPlayed: false }
      if (ko && g.player.active) {
        const koCard = cardById(g.player.active.cardId)
        discardMon(g, 'player', g.player.active)
        g.player.active = null
        scoreKo(g, 'enemy', koCard)
        if (g.winner) return g
        beginPromote(g, 'player')
        if (g.winner || g.promoteSide) return g
      }
    }
  }

  return endTurnInternal(g)
}

export function usableAttacks(mon: BattleMon | null): {
  attack: AttackDef
  index: number
  ready: boolean
}[] {
  if (!mon) return []
  const def = cardById(mon.cardId)
  return def.attacks.map((attack, index) => ({
    attack,
    index,
    ready:
      mon.energy >= attack.energyCost &&
      (!mon.justPlayed || !!def.swift),
  }))
}

export function artUrl(card: CardDef): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${card.art}`
}

export function consumeSfx(g: GameState): { state: GameState; sfx: string[] } {
  const sfx = [...g.sfxQueue]
  if (sfx.length === 0) return { state: g, sfx }
  const n = cloneState(g)
  n.sfxQueue = []
  return { state: n, sfx }
}

export function isBasicId(id: string): boolean {
  return cardById(id).stage === 'basic'
}
