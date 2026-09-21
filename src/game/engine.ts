import {
  CARDS,
  TUTORIAL_DAWN_DECK,
  TUTORIAL_PACK_DECK,
  cardById,
} from '../data/cards'
import type { CardDef, Faction, Keyword } from '../types/cards'

export const BOARD_SLOTS = 3
export const BINDER_MAX_HP = 20

export type Side = 'player' | 'enemy'
export type Phase = 'dawn' | 'main' | 'hunt' | 'dusk' | 'gameover'
export type UiMode = 'idle' | 'play' | 'attack'

export interface BoardBeast {
  uid: string
  cardId: number
  atk: number
  def: number
  hp: number
  maxHp: number
  keywords: Keyword[]
  ward: boolean
  summonSick: boolean
  bonded: boolean
  huntMarked: boolean
  attacking: boolean
  guarding: boolean
  attackedThisTurn: boolean
  blockingUid?: string
  tempAtk: number
  apexUsed: boolean
  side: Side
  slot: number
}

export interface BoardRelic {
  uid: string
  cardId: number
  side: Side
  usedThisTurn: boolean
}

export interface PlayerState {
  binderId: number
  binderHp: number
  storm: number
  stormCap: number
  stormCharges: number
  hand: number[]
  deck: number[]
  discard: number[]
  beasts: (BoardBeast | null)[]
  relics: BoardRelic[]
  binderAbilityUsed: boolean
  faction: Faction
}

export interface CombatFx {
  id: number
  text: string
  kind: 'enter' | 'damage' | 'phase' | 'kill' | 'info'
  targetUid?: string
  amount?: number
}

export interface GameState {
  turn: number
  active: Side
  phase: Phase
  player: PlayerState
  enemy: PlayerState
  log: string[]
  winner: Side | null
  winReason: string
  selectedHand: number | null
  selectedBeastUid: string | null
  uiMode: UiMode
  attackSourceUid: string | null
  playerFaction: 'dawn' | 'pack'
  bannerBonus: boolean
  howlBuffActive: boolean
  fx: CombatFx[]
  fxSeq: number
}

let uidCounter = 0
const uid = () => `u${++uidCounter}`

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makePlayer(
  binderId: number,
  deckIds: number[],
  faction: Faction,
  opening: number[] = [],
): PlayerState {
  let pool = [...deckIds]
  const hand: number[] = []
  for (const id of opening) {
    const idx = pool.indexOf(id)
    if (idx >= 0) {
      pool.splice(idx, 1)
      hand.push(id)
    }
  }
  pool = shuffle(pool)
  while (hand.length < 4 && pool.length) hand.push(pool.shift()!)
  return {
    binderId,
    binderHp: 20,
    storm: 0,
    stormCap: 8,
    stormCharges: 0,
    hand,
    deck: pool,
    discard: [],
    beasts: [null, null, null],
    relics: [],
    binderAbilityUsed: false,
    faction,
  }
}

function pushFx(
  state: GameState,
  text: string,
  kind: CombatFx['kind'],
  extra?: Partial<CombatFx>,
): GameState {
  const id = state.fxSeq + 1
  return {
    ...state,
    fxSeq: id,
    fx: [...state.fx.slice(-8), { id, text, kind, ...extra }],
  }
}

export function createTutorialGame(playerFaction: 'dawn' | 'pack'): GameState {
  uidCounter = 0
  const playerIsDawn = playerFaction === 'dawn'
  const dawnOpen = [3, 5, 7, 19]
  const packOpen = [11, 12, 14, 20]
  const player = makePlayer(
    playerIsDawn ? 1 : 2,
    playerIsDawn ? TUTORIAL_DAWN_DECK : TUTORIAL_PACK_DECK,
    playerFaction,
    playerIsDawn ? dawnOpen : packOpen,
  )
  const enemy = makePlayer(
    playerIsDawn ? 2 : 1,
    playerIsDawn ? TUTORIAL_PACK_DECK : TUTORIAL_DAWN_DECK,
    playerIsDawn ? 'pack' : 'dawn',
    playerIsDawn ? packOpen : dawnOpen,
  )
  const state: GameState = {
    turn: 1,
    active: 'player',
    phase: 'dawn',
    player,
    enemy,
    log: ['Storm gathers over the ruined keep…'],
    winner: null,
    winReason: '',
    selectedHand: null,
    selectedBeastUid: null,
    uiMode: 'idle',
    attackSourceUid: null,
    playerFaction,
    bannerBonus: false,
    howlBuffActive: false,
    fx: [],
    fxSeq: 0,
  }
  return runDawn(state)
}

function sideOf(state: GameState, side: Side): PlayerState {
  return side === 'player' ? state.player : state.enemy
}

function otherSide(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player'
}

function pushLog(state: GameState, msg: string): GameState {
  return { ...state, log: [...state.log.slice(-40), msg] }
}

function checkWin(state: GameState): GameState {
  if (state.player.binderHp <= 0) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'enemy',
      winReason: 'Your Binder fell.',
      uiMode: 'idle',
      attackSourceUid: null,
    }
  }
  if (state.enemy.binderHp <= 0) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'player',
      winReason: 'Rival Binder destroyed!',
      uiMode: 'idle',
      attackSourceUid: null,
    }
  }
  if (state.player.stormCharges >= 3) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'player',
      winReason: 'Banked 3 Storm Charges!',
      uiMode: 'idle',
      attackSourceUid: null,
    }
  }
  if (state.enemy.stormCharges >= 3) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'enemy',
      winReason: 'Enemy banked 3 Storm Charges.',
      uiMode: 'idle',
      attackSourceUid: null,
    }
  }
  return state
}

export function runDawn(state: GameState): GameState {
  if (state.phase === 'gameover') return state
  const active = sideOf(state, state.active)
  const storm = Math.min(active.stormCap, active.storm + 1)
  const nextActive: PlayerState = {
    ...active,
    storm,
    binderAbilityUsed: false,
    relics: active.relics.map((r) => ({ ...r, usedThisTurn: false })),
    beasts: active.beasts.map((b) =>
      b
        ? {
            ...b,
            tempAtk: 0,
            attacking: false,
            attackedThisTurn: false,
            blockingUid: undefined,
            huntMarked: false,
          }
        : null,
    ),
  }
  let next: GameState = {
    ...state,
    howlBuffActive: false,
    phase: 'dawn',
    uiMode: 'idle',
    attackSourceUid: null,
    selectedHand: null,
    selectedBeastUid: null,
    [state.active]: nextActive,
  }
  const who = state.active === 'player' ? 'Your' : 'Enemy'
  next = pushLog(next, `${who} Dawn — Storm ${storm}.`)
  next = pushFx(next, `${who.toUpperCase()} DAWN`, 'phase')
  return runDraw(next)
}

function runDraw(state: GameState): GameState {
  const active = sideOf(state, state.active)
  let deck = [...active.deck]
  let hand = [...active.hand]
  let discard = [...active.discard]
  let binderHp = active.binderHp
  if (deck.length === 0) {
    if (discard.length === 0) {
      binderHp -= 1
    } else {
      deck = shuffle(discard)
      discard = []
    }
  }
  if (deck.length > 0) {
    hand.push(deck.shift()!)
  }
  const nextActive = { ...active, deck, hand, discard, binderHp }
  let next: GameState = {
    ...state,
    phase: 'main',
    [state.active]: nextActive,
  }
  next = pushLog(next, `${state.active === 'player' ? 'You' : 'Enemy'} draw.`)
  next = pushFx(next, 'MAIN PHASE', 'phase')
  return checkWin(next)
}

function hasAdjacentBeast(beasts: (BoardBeast | null)[], slot: number): boolean {
  if (slot > 0 && beasts[slot - 1]) return true
  if (slot < 2 && beasts[slot + 1]) return true
  return false
}

function effectiveCost(
  state: GameState,
  side: Side,
  card: CardDef,
  slot?: number,
): number {
  let cost = card.cost
  const p = sideOf(state, side)
  if (
    p.binderId === 2 &&
    card.type === 'beast' &&
    card.faction === 'pack' &&
    card.keywords.includes('bond') &&
    slot !== undefined &&
    hasAdjacentBeast(p.beasts, slot)
  ) {
    cost = Math.max(1, cost - 1)
  }
  return cost
}

export function canPlayToSlot(
  state: GameState,
  handIndex: number,
  slot: number,
): boolean {
  if (state.phase !== 'main' || state.active !== 'player') return false
  if (state.uiMode === 'attack') return false
  const cardId = state.player.hand[handIndex]
  if (cardId === undefined) return false
  const card = cardById(cardId)
  if (card.type === 'beast') {
    if (state.player.beasts[slot]) return false
    return state.player.storm >= effectiveCost(state, 'player', card, slot)
  }
  if (card.type === 'relic' || card.type === 'storm') {
    return state.player.storm >= card.cost
  }
  return false
}

function spawnBeast(
  state: GameState,
  side: Side,
  card: CardDef,
  slot: number,
): GameState {
  const p = sideOf(state, side)
  const bonded = hasAdjacentBeast(p.beasts, slot)
  let atk = card.atk ?? 0
  let def = card.def ?? 0
  let hp = card.hp ?? 1
  if (state.bannerBonus || p.relics.some((r) => r.cardId === 19)) {
    def += 1
  }
  if (bonded && p.relics.some((r) => r.cardId === 27)) {
    def += 1
  }
  const beast: BoardBeast = {
    uid: uid(),
    cardId: card.id,
    atk,
    def,
    hp,
    maxHp: hp,
    keywords: [...card.keywords],
    ward: card.keywords.includes('ward'),
    summonSick: !card.keywords.includes('swift'),
    bonded,
    huntMarked: false,
    attacking: false,
    guarding: card.keywords.includes('guard'),
    attackedThisTurn: false,
    tempAtk: 0,
    apexUsed: false,
    side,
    slot,
  }
  const beasts = [...p.beasts]
  beasts[slot] = beast
  let next: GameState = {
    ...state,
    [side]: { ...p, beasts },
  }
  next = pushLog(next, `${card.name} enters the arena.`)
  next = pushFx(next, `${card.name} enters the arena`, 'enter', {
    targetUid: beast.uid,
  })

  if (bonded && card.keywords.includes('bond')) {
    if (card.id === 9) {
      const owner = sideOf(next, side)
      next = {
        ...next,
        [side]: { ...owner, binderHp: owner.binderHp + 1 },
      }
      next = pushLog(next, 'Storm Elk Bond — +1 Binder Life.')
    }
    if (card.id === 15 || card.id === 32) {
      next = drawOne(next, side)
      next = pushLog(next, `${card.name} Bond — draw 1.`)
    }
    if (card.id === 31) {
      const b = sideOf(next, side).beasts[slot]!
      const beasts2 = [...sideOf(next, side).beasts]
      beasts2[slot] = { ...b, tempAtk: b.tempAtk + 1 }
      next = { ...next, [side]: { ...sideOf(next, side), beasts: beasts2 } }
      next = pushLog(next, 'Gleam Cub Pack Bond — +1 ATK until Dusk.')
    }
    if (card.id === 33) {
      const owner = sideOf(next, side)
      const beasts2 = owner.beasts.map((bb, i) => {
        if (!bb) return null
        if (Math.abs(i - slot) === 1) return { ...bb, ward: true }
        return bb
      })
      next = { ...next, [side]: { ...owner, beasts: beasts2 } }
      next = pushLog(next, 'Aegis Ram Bond — adjacent allies gain Ward.')
    }
    if (card.id === 36) {
      const owner = sideOf(next, side)
      const beasts2 = owner.beasts.map((bb) =>
        bb && cardById(bb.cardId).faction === 'pack'
          ? { ...bb, def: bb.def + 1 }
          : bb,
      )
      next = { ...next, [side]: { ...owner, beasts: beasts2 } }
      next = pushLog(next, 'Ossuary Bear Bond — Pack beasts +0/+1.')
    }
  }

  if (card.keywords.includes('apex') && !beast.apexUsed) {
    next = resolveApex(next, side, slot)
  }
  return next
}

function drawOne(state: GameState, side: Side): GameState {
  const p = sideOf(state, side)
  let deck = [...p.deck]
  let hand = [...p.hand]
  let discard = [...p.discard]
  if (deck.length === 0 && discard.length > 0) {
    deck = shuffle(discard)
    discard = []
  }
  if (deck.length > 0) {
    hand.push(deck.shift()!)
  }
  return { ...state, [side]: { ...p, deck, hand, discard } }
}

function resolveApex(state: GameState, side: Side, slot: number): GameState {
  const p = sideOf(state, side)
  const beast = p.beasts[slot]
  if (!beast) return state
  const card = cardById(beast.cardId)
  const beasts = [...p.beasts]
  beasts[slot] = { ...beast, apexUsed: true }
  let next: GameState = { ...state, [side]: { ...p, beasts } }

  if (card.id === 10) {
    const foe = sideOf(next, otherSide(side))
    const targets = foe.beasts
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b)
      .sort((a, c) => c.b!.hp - a.b!.hp)
    if (targets.length > 0) {
      next = dealDamage(next, otherSide(side), targets[0].i, 3, 'lightning')
      next = pushLog(next, 'Solar Wyvern Apex — 3 lightning!')
      next = pushFx(next, `${card.name} Apex for 3`, 'damage', { amount: 3 })
    } else {
      next = damageBinder(next, otherSide(side), 3)
      next = pushLog(next, 'Solar Wyvern Apex — 3 to Binder!')
      next = pushFx(next, `${card.name} Apex for 3`, 'damage', { amount: 3 })
    }
  } else if (card.id === 18) {
    next = { ...next, howlBuffActive: true }
    next = pushLog(next, 'Howl Tyrant Apex — Pack +1 ATK this Hunt!')
    next = pushFx(next, 'Howl Tyrant Apex!', 'info')
  } else if (card.id === 30) {
    const foeSide = otherSide(side)
    const foe = sideOf(next, foeSide)
    for (let i = 0; i < 3; i++) {
      if (foe.beasts[i]) {
        next = dealDamage(next, foeSide, i, 2, 'lightning')
      }
    }
    next = pushLog(next, 'Stormfather Stag Apex — 2 to all enemy beasts!')
    next = pushFx(next, 'Stormfather Stag Apex!', 'damage', { amount: 2 })
  } else if (card.id === 40) {
    const foeSide = otherSide(side)
    const foe = sideOf(next, foeSide)
    const beasts2 = foe.beasts.map((b) =>
      b ? { ...b, huntMarked: true } : null,
    )
    next = { ...next, [foeSide]: { ...foe, beasts: beasts2 } }
    next = pushLog(next, 'Voidhowl Alpha Apex — all enemies Hunt-marked!')
    next = pushFx(next, 'Voidhowl Alpha Apex!', 'info')
  }
  return checkWin(next)
}

function damageBinder(state: GameState, side: Side, amount: number): GameState {
  const p = sideOf(state, side)
  return checkWin({
    ...state,
    [side]: { ...p, binderHp: Math.max(0, p.binderHp - amount) },
  })
}

function dealDamage(
  state: GameState,
  side: Side,
  slot: number,
  amount: number,
  _source: string,
): GameState {
  const p = sideOf(state, side)
  const beast = p.beasts[slot]
  if (!beast) return state
  let dmg = amount
  let ward = beast.ward
  if (ward && dmg > 0) {
    ward = false
    dmg = 0
    const beasts = [...p.beasts]
    beasts[slot] = { ...beast, ward }
    let next: GameState = { ...state, [side]: { ...p, beasts } }
    next = pushFx(next, 'Ward negated!', 'info', { targetUid: beast.uid })
    return next
  }
  const hp = beast.hp - dmg
  const beasts = [...p.beasts]
  if (hp <= 0) {
    beasts[slot] = null
    const discard = [...p.discard, beast.cardId]
    let next: GameState = {
      ...state,
      [side]: { ...p, beasts, discard },
    }
    next = pushFx(next, `${cardById(beast.cardId).name} falls!`, 'kill', {
      targetUid: beast.uid,
      amount: dmg,
    })
    return next
  }
  beasts[slot] = { ...beast, hp, ward }
  return { ...state, [side]: { ...p, beasts } }
}

export function playCard(
  state: GameState,
  handIndex: number,
  slot: number,
): GameState {
  if (!canPlayToSlot(state, handIndex, slot) && state.active === 'player') {
    const cardId = state.player.hand[handIndex]
    if (cardId === undefined) return state
    const card = cardById(cardId)
    if (card.type === 'beast') return state
  }
  return playCardForSide(state, 'player', handIndex, slot)
}

function playCardForSide(
  state: GameState,
  side: Side,
  handIndex: number,
  slot: number,
): GameState {
  if (state.phase !== 'main' || state.active !== side) return state
  const p = sideOf(state, side)
  const cardId = p.hand[handIndex]
  if (cardId === undefined) return state
  const card = cardById(cardId)
  const cost =
    card.type === 'beast'
      ? effectiveCost(state, side, card, slot)
      : card.cost
  if (p.storm < cost) return state

  const hand = [...p.hand]
  hand.splice(handIndex, 1)
  let next: GameState = {
    ...state,
    [side]: { ...p, hand, storm: p.storm - cost },
    selectedHand: null,
    uiMode: 'idle',
  }

  if (card.type === 'beast') {
    if (sideOf(next, side).beasts[slot]) return state
    next = spawnBeast(next, side, card, slot)
  } else if (card.type === 'relic') {
    const owner = sideOf(next, side)
    const relic: BoardRelic = {
      uid: uid(),
      cardId: card.id,
      side,
      usedThisTurn: false,
    }
    next = {
      ...next,
      [side]: { ...owner, relics: [...owner.relics, relic] },
      bannerBonus: card.id === 19 ? true : next.bannerBonus,
    }
    next = pushLog(next, `${card.name} relic set.`)
    next = pushFx(next, `${card.name} set`, 'info')
  } else if (card.type === 'storm') {
    next = resolveStorm(next, side, card)
  }
  return checkWin(next)
}

function resolveStorm(state: GameState, side: Side, card: CardDef): GameState {
  let next = pushLog(state, `${card.name} crackles!`)
  next = pushFx(next, `${card.name}!`, 'damage')
  const foe = otherSide(side)
  if (card.id === 29) {
    const enemy = sideOf(next, foe)
    const slots = enemy.beasts
      .map((b, i) => (b ? i : -1))
      .filter((i) => i >= 0)
      .slice(0, 2)
    for (const s of slots) {
      next = dealDamage(next, foe, s, 1, 'surge')
    }
    if (slots.length < 2) {
      next = damageBinder(next, foe, 2 - slots.length)
    }
  } else if (card.id === 38) {
    const enemy = sideOf(next, foe)
    const marked = enemy.beasts.findIndex((b) => b?.huntMarked)
    const target = marked >= 0 ? marked : enemy.beasts.findIndex((b) => b)
    if (target >= 0) {
      const wasMarked = !!enemy.beasts[target]?.huntMarked
      next = dealDamage(next, foe, target, 1, 'surge')
      if (wasMarked) next = drawOne(next, side)
    } else {
      next = damageBinder(next, foe, 1)
    }
  } else if (card.id === 39) {
    const enemy = sideOf(next, foe)
    const target = enemy.beasts.findIndex((b) => b)
    if (target >= 0) next = dealDamage(next, foe, target, 2, 'surge')
    next = damageBinder(next, foe, 1)
  }
  return next
}

export function useBinderAbility(
  state: GameState,
  targetSlot: number,
): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  const p = state.player
  if (p.binderAbilityUsed) return state
  if (p.binderId === 1) {
    if (p.storm < 1) return state
    const b = p.beasts[targetSlot]
    if (!b || cardById(b.cardId).faction !== 'dawn') return state
    const beasts = [...p.beasts]
    beasts[targetSlot] = { ...b, tempAtk: b.tempAtk + 1 }
    let next: GameState = {
      ...state,
      player: {
        ...p,
        storm: p.storm - 1,
        binderAbilityUsed: true,
        beasts,
      },
    }
    next = pushLog(next, 'Lady Sol blesses a Dawnpack beast (+1 ATK).')
    next = pushFx(next, 'Blessed +1 ATK', 'info')
    return next
  }
  return state
}

export function useStormCrown(
  state: GameState,
  targetSide: Side,
  slot: number,
): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  const crown = state.player.relics.find(
    (r) => r.cardId === 20 && !r.usedThisTurn,
  )
  if (!crown || state.player.storm < 1) return state
  const target = sideOf(state, targetSide).beasts[slot]
  if (!target?.huntMarked) return state
  let next = dealDamage(
    {
      ...state,
      player: {
        ...state.player,
        storm: state.player.storm - 1,
        relics: state.player.relics.map((r) =>
          r.uid === crown.uid ? { ...r, usedThisTurn: true } : r,
        ),
      },
    },
    targetSide,
    slot,
    1,
    'surge',
  )
  next = pushLog(next, 'Storm Crown — 1 Surge to Hunt mark!')
  next = pushFx(next, 'Storm Crown Surge for 1', 'damage', { amount: 1 })
  return checkWin(next)
}

export function useKeepHorn(
  state: GameState,
  targetSide: Side,
  slot: number,
): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  const horn = state.player.relics.find(
    (r) => r.cardId === 28 && !r.usedThisTurn,
  )
  if (!horn) return state
  const p = sideOf(state, targetSide)
  const b = p.beasts[slot]
  if (!b) return state
  const beasts = [...p.beasts]
  beasts[slot] = { ...b, huntMarked: true }
  let next: GameState = {
    ...state,
    [targetSide]: { ...p, beasts },
    player: {
      ...state.player,
      relics: state.player.relics.map((r) =>
        r.uid === horn.uid ? { ...r, usedThisTurn: true } : r,
      ),
    },
  }
  next = pushLog(next, 'Keep Horn — Hunt mark set!')
  return next
}

export function bankStormCharge(state: GameState): GameState {
  if (state.phase !== 'main' && state.phase !== 'hunt') return state
  if (state.active !== 'player') return state
  if (state.player.storm < 3) return state
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      storm: state.player.storm - 3,
      stormCharges: state.player.stormCharges + 1,
    },
  }
  next = pushLog(next, `Banked a Storm Charge (${next.player.stormCharges}/3).`)
  next = pushFx(next, `Apex Charge ${next.player.stormCharges}/3`, 'info')
  return checkWin(next)
}

function getAtk(state: GameState, b: BoardBeast): number {
  let atk = b.atk + b.tempAtk
  if (state.howlBuffActive && cardById(b.cardId).faction === 'pack') {
    atk += 1
  }
  return atk
}

export function canBeastAttack(state: GameState, beast: BoardBeast): boolean {
  if (beast.side !== state.active) return false
  if (state.phase !== 'main' && state.phase !== 'hunt') return false
  if (beast.summonSick && !beast.keywords.includes('swift')) return false
  if (beast.attackedThisTurn) return false
  return true
}

/** Guardians / Guard-stance must be hit before face or non-guards. */
export function hasEnemyGuard(state: GameState, foeSide: Side): boolean {
  return sideOf(state, foeSide).beasts.some(
    (b) => b && (b.guarding || b.keywords.includes('guard')),
  )
}

export function isValidAttackTarget(
  state: GameState,
  attackerUid: string,
  target: { kind: 'beast'; uid: string } | { kind: 'face' },
): boolean {
  const attacker =
    state.player.beasts.find((b) => b?.uid === attackerUid) ||
    state.enemy.beasts.find((b) => b?.uid === attackerUid)
  if (!attacker || !canBeastAttack(state, attacker)) return false
  const foe = otherSide(attacker.side)
  const guards = hasEnemyGuard(state, foe)

  if (target.kind === 'face') {
    return !guards
  }
  const foeBeast = sideOf(state, foe).beasts.find((b) => b?.uid === target.uid)
  if (!foeBeast) return false
  if (guards) {
    return foeBeast.guarding || foeBeast.keywords.includes('guard')
  }
  return true
}

export function beginAttack(state: GameState, beastUid: string): GameState {
  if (state.active !== 'player') return state
  if (state.phase !== 'main' && state.phase !== 'hunt') return state
  const beast = state.player.beasts.find((b) => b?.uid === beastUid)
  if (!beast || !canBeastAttack(state, beast)) return state
  let next: GameState = {
    ...state,
    phase: state.phase === 'main' ? 'hunt' : state.phase,
    uiMode: 'attack',
    attackSourceUid: beastUid,
    selectedBeastUid: beastUid,
    selectedHand: null,
  }
  if (state.phase === 'main') {
    next = pushFx(next, 'HUNT PHASE', 'phase')
    next = pushLog(next, 'Hunt — choose a target.')
  }
  return next
}

export function cancelAttack(state: GameState): GameState {
  return {
    ...state,
    uiMode: 'idle',
    attackSourceUid: null,
  }
}

export function resolveAttack(
  state: GameState,
  target: { kind: 'beast'; uid: string } | { kind: 'face' },
): GameState {
  const srcUid = state.attackSourceUid
  if (!srcUid || state.uiMode !== 'attack') return state
  if (!isValidAttackTarget(state, srcUid, target)) return state

  const atkSide = state.active
  const defSide = otherSide(atkSide)
  const attacker = sideOf(state, atkSide).beasts.find((b) => b?.uid === srcUid)
  if (!attacker) return state

  let damage = getAtk(state, attacker)
  if (attacker.keywords.includes('surge') && !attacker.attackedThisTurn) {
    damage += 1
  }
  const name = cardById(attacker.cardId).name

  // Mark attacker as spent
  const atkBeasts = [...sideOf(state, atkSide).beasts]
  atkBeasts[attacker.slot] = {
    ...attacker,
    attackedThisTurn: true,
    attacking: false,
  }
  let next: GameState = {
    ...state,
    [atkSide]: { ...sideOf(state, atkSide), beasts: atkBeasts },
    uiMode: 'idle',
    attackSourceUid: null,
    selectedBeastUid: null,
  }

  if (target.kind === 'face') {
    next = damageBinder(next, defSide, damage)
    next = pushLog(next, `${name} Surges for ${damage}!`)
    next = pushFx(next, `${name} Surges for ${damage}`, 'damage', {
      amount: damage,
    })
    return checkWin(next)
  }

  const foe = sideOf(next, defSide)
  const blockerIdx = foe.beasts.findIndex((b) => b?.uid === target.uid)
  if (blockerIdx < 0) return next
  const blocker = foe.beasts[blockerIdx]!

  next = dealDamage(next, defSide, blockerIdx, damage, 'combat')
  next = pushLog(
    next,
    `${name} strikes ${cardById(blocker.cardId).name} for ${damage}.`,
  )
  next = pushFx(next, `${name} Surges for ${damage}`, 'damage', {
    amount: damage,
    targetUid: blocker.uid,
  })

  // Retaliation if blocker survived
  const still = sideOf(next, defSide).beasts[blockerIdx]
  if (still) {
    const retal = getAtk(next, still)
    next = dealDamage(next, atkSide, attacker.slot, retal, 'combat')
    if (retal > 0) {
      next = pushFx(next, `${cardById(still.cardId).name} hits back for ${retal}`, 'damage', {
        amount: retal,
        targetUid: attacker.uid,
      })
    }
  }
  return checkWin(next)
}

export function toggleGuard(state: GameState, slot: number): GameState {
  if (state.active !== 'player') return state
  if (state.phase !== 'main' && state.phase !== 'hunt') return state
  const b = state.player.beasts[slot]
  if (!b) return state
  const beasts = [...state.player.beasts]
  const guarding = !b.guarding
  beasts[slot] = { ...b, guarding }
  let next: GameState = {
    ...state,
    player: { ...state.player, beasts },
    uiMode: 'idle',
    attackSourceUid: null,
  }
  const name = cardById(b.cardId).name
  next = pushLog(
    next,
    guarding ? `${name} stands Guard.` : `${name} drops Guard.`,
  )
  next = pushFx(
    next,
    guarding ? `${name} Guards` : `${name} drops Guard`,
    'info',
  )
  return next
}

export function triggerApexOrBank(state: GameState, slot: number): GameState {
  if (state.active !== 'player') return state
  const b = state.player.beasts[slot]
  if (!b) return state
  const card = cardById(b.cardId)
  if (card.keywords.includes('apex') && !b.apexUsed) {
    return resolveApex(state, 'player', slot)
  }
  return bankStormCharge(state)
}

function runDusk(state: GameState): GameState {
  const active = sideOf(state, state.active)
  const beasts = active.beasts.map((b) =>
    b
      ? {
          ...b,
          tempAtk: 0,
          summonSick: false,
          attacking: false,
          attackedThisTurn: false,
          blockingUid: undefined,
        }
      : null,
  )

  let next: GameState = {
    ...state,
    phase: 'dusk',
    uiMode: 'idle',
    attackSourceUid: null,
    selectedHand: null,
    selectedBeastUid: null,
    [state.active]: {
      ...active,
      storm: 0,
      beasts,
    },
  }
  next = pushLog(next, 'Dusk — unused Storm empties.')
  next = pushFx(next, 'DUSK', 'phase')

  const nextActive = otherSide(state.active)
  const turn = nextActive === 'player' ? state.turn + 1 : state.turn
  next = {
    ...next,
    active: nextActive,
    turn,
  }
  next = checkWin(next)
  if (next.phase === 'gameover') return next
  return runDawn(next)
}

/** End Turn advances Main→Hunt (if attacks pending) or Hunt→Dusk→enemy. */
export function endTurn(state: GameState): GameState {
  if (state.phase === 'gameover' || state.active !== 'player') return state

  if (state.uiMode === 'attack') {
    return cancelAttack(state)
  }

  if (state.phase === 'main') {
    // Enter Hunt if any ready attackers, else go straight to dusk
    const ready = state.player.beasts.some(
      (b) => b && canBeastAttack(state, b),
    )
    if (ready) {
      let next: GameState = {
        ...state,
        phase: 'hunt',
        uiMode: 'idle',
        selectedHand: null,
      }
      next = pushLog(next, 'Hunt — tap a beast, then Attack a target.')
      next = pushFx(next, 'HUNT PHASE', 'phase')
      return next
    }
    return runDusk(state)
  }

  if (state.phase === 'hunt') {
    return runDusk(state)
  }

  return state
}

/** Simple AI: play beasts onto board, then attack valid targets. */
export function runEnemyTurn(state: GameState): GameState {
  if (state.active !== 'enemy' || state.phase === 'gameover') return state
  let next = state

  // Main: play cards greedily onto empty slots
  let safety = 12
  while (safety-- > 0 && next.phase === 'main' && next.active === 'enemy') {
    const p = next.enemy
    let played = false
    const indices = p.hand
      .map((id, i) => ({ id, i, cost: cardById(id).cost }))
      .sort((a, b) => a.cost - b.cost)

    for (const { i, id } of indices) {
      const card = cardById(id)
      if (card.type === 'beast') {
        const slot = p.beasts.findIndex((b) => !b)
        if (slot >= 0 && p.storm >= effectiveCost(next, 'enemy', card, slot)) {
          next = playCardForSide(next, 'enemy', i, slot)
          played = true
          break
        }
      } else if (card.type === 'relic' && p.storm >= card.cost) {
        next = playCardForSide(next, 'enemy', i, 0)
        played = true
        break
      } else if (card.type === 'storm' && p.storm >= card.cost && p.beasts.some(Boolean)) {
        next = playCardForSide(next, 'enemy', i, 0)
        played = true
        break
      }
    }
    if (!played) break
  }

  if (next.phase === 'gameover') return next

  // Put one beast on Guard if available
  if (next.active === 'enemy' && next.phase === 'main') {
    const guardIdx = next.enemy.beasts.findIndex(
      (b) => b && (b.keywords.includes('guard') || b.def >= 3),
    )
    if (guardIdx >= 0 && next.enemy.beasts[guardIdx]) {
      const beasts = [...next.enemy.beasts]
      beasts[guardIdx] = { ...beasts[guardIdx]!, guarding: true }
      next = { ...next, enemy: { ...next.enemy, beasts } }
    }
  }

  // Hunt: attack with all eligible
  if (next.active === 'enemy' && (next.phase === 'main' || next.phase === 'hunt')) {
    next = {
      ...next,
      phase: 'hunt',
    }
    next = pushFx(next, 'ENEMY HUNT', 'phase')

    for (let slot = 0; slot < 3; slot++) {
      if (next.phase === 'gameover' || next.active !== 'enemy') break
      const b = next.enemy.beasts[slot]
      if (!b || !canBeastAttack(next, b)) continue

      next = {
        ...next,
        uiMode: 'attack',
        attackSourceUid: b.uid,
      }

      // Prefer killing / hitting player guards, else any beast, else face
      const playerGuards = next.player.beasts
        .map((pb, i) => ({ pb, i }))
        .filter(
          ({ pb }) =>
            pb && (pb.guarding || pb.keywords.includes('guard')),
        )
      let target: { kind: 'beast'; uid: string } | { kind: 'face' }
      if (playerGuards.length > 0) {
        target = { kind: 'beast', uid: playerGuards[0].pb!.uid }
      } else {
        const any = next.player.beasts.find((pb) => pb)
        if (any) target = { kind: 'beast', uid: any.uid }
        else target = { kind: 'face' }
      }
      next = resolveAttack(next, target)
    }
  }

  if (next.phase === 'gameover') return next
  if (next.active === 'enemy') {
    next = runDusk(next)
  }
  return next
}

export function selectBeast(state: GameState, beastUid: string | null): GameState {
  return {
    ...state,
    selectedBeastUid: beastUid,
    selectedHand: null,
    uiMode: state.uiMode === 'attack' ? 'idle' : state.uiMode,
    attackSourceUid: state.uiMode === 'attack' ? null : state.attackSourceUid,
  }
}

export function selectHand(state: GameState, index: number | null): GameState {
  return {
    ...state,
    selectedHand: index,
    selectedBeastUid: null,
    uiMode: index !== null ? 'play' : 'idle',
    attackSourceUid: null,
  }
}

export function clearFx(state: GameState, id: number): GameState {
  return { ...state, fx: state.fx.filter((f) => f.id !== id) }
}

export function getCard(id: number): CardDef {
  return cardById(id)
}

export function allCards(): CardDef[] {
  return CARDS
}

// Back-compat stubs used by older UI (no-ops / thin wrappers)
export function toggleAttack(state: GameState, slot: number): GameState {
  const b = state.player.beasts[slot]
  if (!b) return state
  return beginAttack(state, b.uid)
}

export function startHunt(state: GameState): GameState {
  if (state.phase !== 'main') return state
  return {
    ...state,
    phase: 'hunt',
  }
}

export function confirmAttackers(state: GameState): GameState {
  return endTurn(state)
}

export function skipHunt(state: GameState): GameState {
  return runDusk(state)
}

export function endMainPhase(state: GameState): GameState {
  return endTurn(state)
}
