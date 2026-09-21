import {
  CARDS,
  TUTORIAL_DAWN_DECK,
  TUTORIAL_PACK_DECK,
  cardById,
} from '../data/cards'
import type { CardDef, Faction, Keyword } from '../types/cards'

export type Side = 'player' | 'enemy'
export type Phase = 'dawn' | 'draw' | 'main' | 'hunt' | 'dusk' | 'gameover'
export type HuntStep = 'declare' | 'block' | 'resolve' | 'done'

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

export interface GameState {
  turn: number
  active: Side
  phase: Phase
  huntStep: HuntStep
  player: PlayerState
  enemy: PlayerState
  log: string[]
  winner: Side | null
  winReason: string
  selectedHand: number | null
  selectedBeastUid: string | null
  playerFaction: 'dawn' | 'pack'
  bannerBonus: boolean // Banner of the Hunt: +0/+1 on enter
  howlBuffActive: boolean
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
): PlayerState {
  const deck = shuffle(deckIds)
  const hand = deck.splice(0, 4)
  return {
    binderId,
    binderHp: 20,
    storm: 0,
    stormCap: 8,
    stormCharges: 0,
    hand,
    deck,
    discard: [],
    beasts: [null, null, null, null, null],
    relics: [],
    binderAbilityUsed: false,
    faction,
  }
}

export function createTutorialGame(playerFaction: 'dawn' | 'pack'): GameState {
  uidCounter = 0
  const playerIsDawn = playerFaction === 'dawn'
  const player = makePlayer(
    playerIsDawn ? 1 : 2,
    playerIsDawn ? TUTORIAL_DAWN_DECK : TUTORIAL_PACK_DECK,
    playerFaction,
  )
  const enemy = makePlayer(
    playerIsDawn ? 2 : 1,
    playerIsDawn ? TUTORIAL_PACK_DECK : TUTORIAL_DAWN_DECK,
    playerIsDawn ? 'pack' : 'dawn',
  )
  const state: GameState = {
    turn: 1,
    active: 'player',
    phase: 'dawn',
    huntStep: 'done',
    player,
    enemy,
    log: ['Storm gathers over the ruined keep…'],
    winner: null,
    winReason: '',
    selectedHand: null,
    selectedBeastUid: null,
    playerFaction,
    bannerBonus: false,
    howlBuffActive: false,
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
    }
  }
  if (state.enemy.binderHp <= 0) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'player',
      winReason: 'Rival Binder destroyed!',
    }
  }
  if (state.player.stormCharges >= 3) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'player',
      winReason: 'Banked 3 Storm Charges!',
    }
  }
  if (state.enemy.stormCharges >= 3) {
    return {
      ...state,
      phase: 'gameover',
      winner: 'enemy',
      winReason: 'Enemy banked 3 Storm Charges.',
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
    [state.active]: nextActive,
  }
  next = pushLog(
    next,
    `${state.active === 'player' ? 'Your' : 'Enemy'} Dawn — Storm ${storm}.`,
  )
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
    huntStep: 'done',
    [state.active]: nextActive,
  }
  next = pushLog(next, `${state.active === 'player' ? 'You' : 'Enemy'} draw.`)
  return checkWin(next)
}

function hasAdjacentBeast(beasts: (BoardBeast | null)[], slot: number): boolean {
  if (slot > 0 && beasts[slot - 1]) return true
  if (slot < 4 && beasts[slot + 1]) return true
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
  // Lord Bone Alpha Vex: Pack beasts you Bond cost 1 less (min 1)
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
  const cardId = state.player.hand[handIndex]
  if (cardId === undefined) return false
  const card = cardById(cardId)
  if (card.type === 'beast') {
    if (state.player.beasts[slot]) return false
    return state.player.storm >= effectiveCost(state, 'player', card, slot)
  }
  if (card.type === 'relic') {
    return state.player.storm >= card.cost
  }
  if (card.type === 'storm') {
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
  // Iron Collar: Bonded beast +1 DEF
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
  next = pushLog(next, `${card.name} enters lane ${slot + 1}.`)

  // Bond triggers
  if (bonded && card.keywords.includes('bond')) {
    if (card.id === 9) {
      // Storm Elk → gain 1 Life
      const owner = sideOf(next, side)
      next = {
        ...next,
        [side]: { ...owner, binderHp: owner.binderHp + 1 },
      }
      next = pushLog(next, 'Storm Elk Bond — +1 Binder Life.')
    }
    if (card.id === 15 || card.id === 32) {
      // Wraith Hound / Rattle Vulture — draw 1
      next = drawOne(next, side)
      next = pushLog(next, `${card.name} Bond — draw 1.`)
    }
    if (card.id === 31) {
      const b = sideOf(next, side).beasts[slot]!
      b.tempAtk += 1
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

  // Apex triggers
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
    // Solar Wyvern: deal 3 to enemy beast with highest HP, else binder
    const foe = sideOf(next, otherSide(side))
    const targets = foe.beasts
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b)
      .sort((a, c) => (c.b!.hp) - (a.b!.hp))
    if (targets.length > 0) {
      next = dealDamage(next, otherSide(side), targets[0].i, 3, 'lightning')
      next = pushLog(next, 'Solar Wyvern Apex — 3 lightning!')
    } else {
      next = damageBinder(next, otherSide(side), 3)
      next = pushLog(next, 'Solar Wyvern Apex — 3 to Binder!')
    }
  } else if (card.id === 18) {
    next = { ...next, howlBuffActive: true }
    next = pushLog(next, 'Howl Tyrant Apex — Pack +1 ATK this Hunt!')
  } else if (card.id === 30) {
    const foeSide = otherSide(side)
    const foe = sideOf(next, foeSide)
    for (let i = 0; i < 5; i++) {
      if (foe.beasts[i]) {
        next = dealDamage(next, foeSide, i, 2, 'lightning')
      }
    }
    next = pushLog(next, 'Stormfather Stag Apex — 2 to all enemy beasts!')
  } else if (card.id === 40) {
    const foeSide = otherSide(side)
    const foe = sideOf(next, foeSide)
    const beasts2 = foe.beasts.map((b) =>
      b ? { ...b, huntMarked: true } : null,
    )
    next = { ...next, [foeSide]: { ...foe, beasts: beasts2 } }
    next = pushLog(next, 'Voidhowl Alpha Apex — all enemies Hunt-marked!')
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
  }
  // DEF reduces residual? Keep simple: DEF is toughness buffer already in HP model.
  // Spec uses ATK/DEF/HP — treat DEF as damage reduction 0 for MVP simplicity;
  // HP is the life pool. DEF shown for flavor / future.
  const hp = beast.hp - dmg
  const beasts = [...p.beasts]
  if (hp <= 0) {
    beasts[slot] = null
    const discard = [...p.discard, beast.cardId]
    return {
      ...state,
      [side]: { ...p, beasts, discard },
    }
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
    // For storm/relic, slot may be ignored
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
  } else if (card.type === 'storm') {
    next = resolveStorm(next, side, card)
  }
  return checkWin(next)
}

function resolveStorm(state: GameState, side: Side, card: CardDef): GameState {
  let next = pushLog(state, `${card.name} crackles!`)
  const foe = otherSide(side)
  if (card.id === 29) {
    // Chain Bolt: 1 to two beasts
    const enemy = sideOf(next, foe)
    const slots = enemy.beasts
      .map((b, i) => (b ? i : -1))
      .filter((i) => i >= 0)
      .slice(0, 2)
    for (const s of slots) {
      next = dealDamage(next, foe, s, 1, 'surge')
    }
    if (slots.length < 2) {
      // leftover to binder
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
    // Lady Dawnwarden Sol: pay 1 → Dawnpack beast +1 ATK until dusk
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
    return next
  }
  return state
}

export function useStormCrown(state: GameState, targetSide: Side, slot: number): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  const crown = state.player.relics.find((r) => r.cardId === 20 && !r.usedThisTurn)
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
  return checkWin(next)
}

export function useKeepHorn(state: GameState, targetSide: Side, slot: number): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  const horn = state.player.relics.find((r) => r.cardId === 28 && !r.usedThisTurn)
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
  // Optional: spend remaining storm at dusk? Spec: bank 3 Storm Charges to win.
  // Ashen Reliquary: at Dawn if Bonded, bank 1 — handled separately.
  // Simple MVP: in main, pay 3 storm to bank 1 charge once per turn via button.
  if (state.phase !== 'main' || state.active !== 'player') return state
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
  return checkWin(next)
}

export function toggleAttack(state: GameState, slot: number): GameState {
  if (state.phase !== 'hunt' || state.huntStep !== 'declare') return state
  if (state.active !== 'player') return state
  const b = state.player.beasts[slot]
  if (!b || (b.summonSick && !b.keywords.includes('swift'))) return state
  const beasts = [...state.player.beasts]
  beasts[slot] = { ...b, attacking: !b.attacking }
  return { ...state, player: { ...state.player, beasts } }
}

export function startHunt(state: GameState): GameState {
  if (state.phase !== 'main' || state.active !== 'player') return state
  // Clear summon sickness for next turns is at dusk; attackers declare now
  let next: GameState = {
    ...state,
    phase: 'hunt',
    huntStep: 'declare',
  }
  next = pushLog(next, 'Hunt begins — declare attackers.')
  return next
}

export function confirmAttackers(state: GameState): GameState {
  if (state.phase !== 'hunt' || state.huntStep !== 'declare') return state
  // Auto-block for AI when player attacks
  let next: GameState = { ...state, huntStep: 'block' }
  next = autoBlock(next, 'enemy')
  return resolveCombat(next)
}

function autoBlock(state: GameState, blockerSide: Side): GameState {
  const attackers = sideOf(state, otherSide(blockerSide)).beasts.filter(
    (b) => b?.attacking,
  ) as BoardBeast[]
  const blocker = sideOf(state, blockerSide)
  const beasts: (BoardBeast | null)[] = blocker.beasts.map((b) => (b ? { ...b, blockingUid: undefined } : null))
  const used = new Set<number>()

  for (const atk of attackers) {
    // Prefer Guard, then any that can block Flight
    const candidates = beasts
      .map((b, i) => ({ b, i }))
      .filter(({ b, i }) => {
        if (!b || used.has(i)) return false
        if (atk.keywords.includes('flight')) {
          return b.keywords.includes('flight') || b.keywords.includes('hunt')
        }
        return true
      })
    candidates.sort((a, c) => {
      const ag = a.b!.keywords.includes('guard') ? 0 : 1
      const cg = c.b!.keywords.includes('guard') ? 0 : 1
      return ag - cg || a.b!.hp - c.b!.hp
    })
    if (candidates.length > 0) {
      const pick = candidates[0]
      used.add(pick.i)
      beasts[pick.i] = { ...pick.b!, blockingUid: atk.uid }
    }
  }
  return { ...state, [blockerSide]: { ...blocker, beasts } }
}

function getAtk(state: GameState, b: BoardBeast): number {
  let atk = b.atk + b.tempAtk
  if (
    state.howlBuffActive &&
    cardById(b.cardId).faction === 'pack'
  ) {
    atk += 1
  }
  return atk
}

function resolveCombat(state: GameState): GameState {
  let next: GameState = { ...state, huntStep: 'resolve' }
  const atkSide = state.active
  const defSide = otherSide(atkSide)
  const attackers = sideOf(next, atkSide).beasts.filter(
    (b) => b?.attacking,
  ) as BoardBeast[]

  for (const attacker of attackers) {
    const def = sideOf(next, defSide)
    const blockerEntry = def.beasts
      .map((b, i) => ({ b, i }))
      .find(({ b }) => b?.blockingUid === attacker.uid)

    let damage = getAtk(next, attacker)
    if (attacker.keywords.includes('surge')) {
      damage += 1 // first hit surge
    }

    if (blockerEntry?.b) {
      // simultaneous-ish: attacker hits blocker, blocker hits back
      next = dealDamage(next, defSide, blockerEntry.i, damage, 'combat')
      const blockerStill = sideOf(next, defSide).beasts[blockerEntry.i]
      if (blockerStill) {
        next = dealDamage(
          next,
          atkSide,
          attacker.slot,
          getAtk(next, blockerStill),
          'combat',
        )
      }
    } else {
      // Unblocked → binder, Hunt-marked prioritization flavor
      next = damageBinder(next, defSide, damage)
      next = pushLog(
        next,
        `${cardById(attacker.cardId).name} surges the Binder for ${damage}!`,
      )
    }
  }

  next = { ...next, huntStep: 'done' }
  next = checkWin(next)
  if (next.phase === 'gameover') return next
  return runDusk(next)
}

function runDusk(state: GameState): GameState {
  const active = sideOf(state, state.active)
  // Clear temp ATK, unused storm empties, clear summon sick
  const beasts = active.beasts.map((b) =>
    b
      ? {
          ...b,
          tempAtk: 0,
          summonSick: false,
          attacking: false,
          blockingUid: undefined,
        }
      : null,
  )
  // Ashen Reliquary charge at dusk/dawn — bank if bonded present
  let charges = active.stormCharges
  if (
    active.relics.some((r) => r.cardId === 37) &&
    beasts.some((b) => b?.bonded)
  ) {
    // once-ish: give charge if under 3
    if (charges < 3 && state.turn % 2 === 1 && state.active === 'player') {
      // simple: +1 every other turn max — just +1 when condition met, capped by check
      // Spec: max once from relic — use relic used flag
    }
  }

  let next: GameState = {
    ...state,
    phase: 'dusk',
    [state.active]: {
      ...active,
      storm: 0,
      beasts,
      stormCharges: charges,
    },
  }
  next = pushLog(next, 'Dusk — unused Storm empties.')

  // Pass turn
  const nextActive = otherSide(state.active)
  const turn = nextActive === 'player' ? state.turn + 1 : state.turn
  next = {
    ...next,
    active: nextActive,
    turn,
    selectedHand: null,
    selectedBeastUid: null,
  }
  next = checkWin(next)
  if (next.phase === 'gameover') return next
  return runDawn(next)
}

export function endMainPhase(state: GameState): GameState {
  return startHunt(state)
}

export function skipHunt(state: GameState): GameState {
  if (state.phase === 'hunt' && state.huntStep === 'declare') {
    // No attackers
    const beasts = state.player.beasts.map((b) =>
      b ? { ...b, attacking: false } : null,
    )
    return resolveCombat({
      ...state,
      player: { ...state.player, beasts },
      huntStep: 'block',
    })
  }
  return state
}

/** Simple AI: play cheapest affordable cards, then attack with all. */
export function runEnemyTurn(state: GameState): GameState {
  if (state.active !== 'enemy' || state.phase === 'gameover') return state
  let next = state

  // Main: play cards greedily
  let safety = 12
  while (safety-- > 0 && next.phase === 'main' && next.active === 'enemy') {
    const p = next.enemy
    let played = false
    // Sort hand by cost ascending
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
      } else if (card.type === 'storm' && p.storm >= card.cost && p.storm >= 3) {
        next = playCardForSide(next, 'enemy', i, 0)
        played = true
        break
      }
    }
    if (!played) break
  }

  if (next.phase === 'gameover') return next

  // Hunt: attack with all eligible
  if (next.active === 'enemy' && next.phase === 'main') {
    const beasts = next.enemy.beasts.map((b) =>
      b && !b.summonSick ? { ...b, attacking: true } : b,
    )
    next = {
      ...next,
      enemy: { ...next.enemy, beasts },
      phase: 'hunt',
      huntStep: 'declare',
    }
    next = pushLog(next, 'Enemy declares Hunt.')
    next = autoBlock(next, 'player')
    next = resolveCombat(next)
  }

  return next
}

export function selectHand(state: GameState, index: number | null): GameState {
  return { ...state, selectedHand: index, selectedBeastUid: null }
}

export function getCard(id: number): CardDef {
  return cardById(id)
}

export function allCards(): CardDef[] {
  return CARDS
}
