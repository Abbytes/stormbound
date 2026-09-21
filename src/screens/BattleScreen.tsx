import { useEffect, useRef, useState } from 'react'
import {
  createTutorialGame,
  playCard,
  selectHand,
  selectBeast,
  endTurn,
  runEnemyTurn,
  useBinderAbility,
  useStormCrown,
  useKeepHorn,
  canPlayToSlot,
  canBeastAttack,
  beginAttack,
  cancelAttack,
  resolveAttack,
  toggleGuard,
  triggerApexOrBank,
  isValidAttackTarget,
  hasEnemyGuard,
  clearFx,
  BINDER_MAX_HP,
  type GameState,
  type CombatFx,
} from '../game/engine'
import { cardById } from '../data/cards'
import { BoardSlot } from '../components/BoardSlot'
import { CardFace } from '../components/CardFace'
import { InspectOverlay, openInspect } from '../components/InspectOverlay'
import type { CardDef } from '../types/cards'
import { playSfx } from '../game/audio'

interface Props {
  faction: 'dawn' | 'pack'
  onQuit: () => void
}

function HpBar({
  hp,
  max,
  gradient,
}: {
  hp: number
  max: number
  gradient: string
}) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100))
  return (
    <div className="h-2.5 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${gradient}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

const PHASE_LABEL: Record<string, string> = {
  dawn: 'DAWN',
  main: 'MAIN',
  hunt: 'HUNT',
  dusk: 'DUSK',
  gameover: 'END',
}

export function BattleScreen({ faction, onQuit }: Props) {
  const [state, setState] = useState<GameState>(() => createTutorialGame(faction))
  const [inspect, setInspect] = useState<CardDef | null>(null)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('The gates open. Summon a beast from your hand.')
  const [toast, setToast] = useState<CombatFx | null>(null)
  const [dmgFlash, setDmgFlash] = useState<Record<string, number>>({})
  const prevLogLen = useRef(0)
  const seenFx = useRef(new Set<number>())

  // FX → toast + damage numbers
  useEffect(() => {
    const timers: number[] = []
    for (const fx of state.fx) {
      if (seenFx.current.has(fx.id)) continue
      seenFx.current.add(fx.id)
      // Prefer non-phase toasts over phase banners when both fire
      setToast((cur) => (fx.kind === 'phase' && cur && cur.kind !== 'phase' ? cur : fx))
      if (fx.kind === 'enter') playSfx('iron_clink', 0.45)
      if (fx.kind === 'damage') playSfx('surge_bolt', 0.5)
      if (fx.kind === 'kill') playSfx('apex_kill', 0.55)
      if (fx.kind === 'phase' && state.active === 'player') playSfx('dawn_horn', 0.2)
      if (fx.amount && fx.targetUid) {
        const uid = fx.targetUid
        const amt = fx.amount
        setDmgFlash((d) => ({ ...d, [uid]: amt }))
        timers.push(
          window.setTimeout(() => {
            setDmgFlash((d) => {
              const n = { ...d }
              delete n[uid]
              return n
            })
          }, 900),
        )
      }
      const id = fx.id
      const delay = fx.kind === 'phase' ? 900 : 1600
      timers.push(
        window.setTimeout(() => {
          setToast((cur) => (cur?.id === id ? null : cur))
          setState((s) => clearFx(s, id))
        }, delay),
      )
    }
    return () => timers.forEach((t) => clearTimeout(t))
  }, [state.fx, state.active])

  useEffect(() => {
    const msgs = state.log.slice(prevLogLen.current)
    prevLogLen.current = state.log.length
    for (const m of msgs) {
      const lower = m.toLowerCase()
      if (lower.includes('apex')) playSfx('apex_kill')
      else if (
        lower.includes('surge') ||
        lower.includes('chain bolt') ||
        lower.includes('lightning')
      )
        playSfx('surge_bolt')
      else if (lower.includes('bond')) {
        playSfx(
          state.playerFaction === 'pack' || lower.includes('pack')
            ? 'bond'
            : 'iron_clink',
        )
      } else if (lower.includes('dawn —')) playSfx('dawn_horn', 0.4)
    }
    if (msgs.length) setHint(msgs[msgs.length - 1])
  }, [state.log, state.playerFaction])

  useEffect(() => {
    if (state.active !== 'enemy' || state.phase === 'gameover') return
    let cancelled = false
    setBusy(true)
    const t = window.setTimeout(() => {
      if (cancelled) return
      setState((s) => runEnemyTurn(s))
      setBusy(false)
    }, 600)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [state.active, state.phase, state.turn])

  const selectedCard =
    state.selectedHand !== null
      ? cardById(state.player.hand[state.selectedHand])
      : null
  const selectedBeast = state.selectedBeastUid
    ? state.player.beasts.find((b) => b?.uid === state.selectedBeastUid) ??
      state.enemy.beasts.find((b) => b?.uid === state.selectedBeastUid) ??
      null
    : null

  const waitingPlay =
    state.phase === 'main' &&
    state.active === 'player' &&
    selectedCard?.type === 'beast' &&
    state.selectedHand !== null &&
    state.uiMode !== 'attack'

  const attacking = state.uiMode === 'attack' && !!state.attackSourceUid
  const faceLegal =
    attacking &&
    isValidAttackTarget(state, state.attackSourceUid!, { kind: 'face' })

  const onSlotPlayer = (slot: number) => {
    if (waitingPlay && state.selectedHand !== null) {
      if (!canPlayToSlot(state, state.selectedHand, slot)) return
      const before = state
      const next = playCard(before, state.selectedHand, slot)
      if (next !== before) {
        const c = selectedCard!
        if (c.keywords.includes('bond')) {
          playSfx(c.faction === 'pack' ? 'bond' : 'iron_clink')
        } else if (c.type === 'beast') {
          playSfx('iron_clink', 0.4)
        }
        if (c.keywords.includes('apex')) playSfx('apex_kill')
        setHint(`${c.name} enters the arena.`)
      }
      setState(next)
      return
    }
    const beast = state.player.beasts[slot]
    if (!beast) return

    if (attacking) {
      // Tap same attacker to cancel; otherwise switch attacker
      if (state.attackSourceUid === beast.uid) {
        setState((s) => cancelAttack(s))
        setHint('Attack cancelled.')
        return
      }
      if (canBeastAttack(state, beast)) {
        playSfx('surge_bolt', 0.45)
        setState((s) => beginAttack(s, beast.uid))
        setHint(
          hasEnemyGuard(state, 'enemy')
            ? 'Tap a Guardian first.'
            : 'Tap the enemy Binder (HP bar) or a beast.',
        )
        return
      }
      setState((s) => cancelAttack(s))
      return
    }

    if (state.active === 'player' && (state.phase === 'main' || state.phase === 'hunt')) {
      // Hunt: one tap starts Attack targeting (HS-style). Main: select + show actions.
      if (state.phase === 'hunt' && canBeastAttack(state, beast)) {
        playSfx('surge_bolt', 0.45)
        setState((s) => beginAttack(s, beast.uid))
        setHint(
          hasEnemyGuard(state, 'enemy')
            ? 'Tap a Guardian first.'
            : 'Tap the glowing enemy Binder to deal face damage.',
        )
        return
      }
      setState((s) => selectBeast(s, beast.uid))
      setHint(
        canBeastAttack(state, beast)
          ? `${cardById(beast.cardId).name}: tap Attack, or Guard / Apex.`
          : `${cardById(beast.cardId).name}: can't Attack yet.`,
      )
      return
    }
    openInspect(cardById(beast.cardId), setInspect)
  }

  const onSlotEnemy = (slot: number) => {
    const beast = state.enemy.beasts[slot]

    // Empty board / empty slot: strike Binder face when legal
    if (attacking && !beast) {
      onFaceEnemy()
      return
    }

    if (attacking && beast) {
      if (
        isValidAttackTarget(state, state.attackSourceUid!, {
          kind: 'beast',
          uid: beast.uid,
        })
      ) {
        playSfx('surge_bolt')
        setState((s) =>
          resolveAttack(s, { kind: 'beast', uid: beast.uid }),
        )
        return
      }
      setHint(
        hasEnemyGuard(state, 'enemy')
          ? 'A Guardian blocks the path — strike Guard first.'
          : 'Invalid target.',
      )
      return
    }

    if (state.phase === 'main' && state.active === 'player') {
      const hasCrown = state.player.relics.some(
        (r) => r.cardId === 20 && !r.usedThisTurn,
      )
      const hasHorn = state.player.relics.some(
        (r) => r.cardId === 28 && !r.usedThisTurn,
      )
      if (hasHorn && beast) {
        setState((s) => useKeepHorn(s, 'enemy', slot))
        return
      }
      if (hasCrown && beast?.huntMarked) {
        setState((s) => useStormCrown(s, 'enemy', slot))
        playSfx('surge_bolt')
        return
      }
    }
    if (beast) {
      setState((s) => selectBeast(s, beast.uid))
      openInspect(cardById(beast.cardId), setInspect)
    }
  }

  const onFaceEnemy = () => {
    if (!attacking || !faceLegal) {
      if (attacking && hasEnemyGuard(state, 'enemy')) {
        setHint('Guardians must be broken before the Binder.')
      }
      return
    }
    playSfx('surge_bolt')
    setState((s) => resolveAttack(s, { kind: 'face' }))
  }

  const playNonBeast = () => {
    if (state.selectedHand === null || !selectedCard) return
    if (selectedCard.type === 'beast') return
    const next = playCard(state, state.selectedHand, 0)
    if (selectedCard.type === 'storm') playSfx('surge_bolt')
    else playSfx('iron_clink', 0.35)
    setState(next)
  }

  const doAttack = () => {
    if (!selectedBeast || selectedBeast.side !== 'player') return
    if (!canBeastAttack(state, selectedBeast)) {
      setHint(
        selectedBeast.attackedThisTurn
          ? 'Already struck this turn.'
          : 'Summoning sickness — wait until next Dawn (or need Swift).',
      )
      return
    }
    playSfx('surge_bolt', 0.5)
    setState((s) => beginAttack(s, selectedBeast.uid))
    setHint(
      hasEnemyGuard(state, 'enemy')
        ? 'Tap a Guardian, or cancel.'
        : 'Tap an enemy beast — or the Binder if the board is clear.',
    )
  }

  const doGuard = () => {
    if (!selectedBeast || selectedBeast.side !== 'player') return
    setState((s) => toggleGuard(s, selectedBeast.slot))
    playSfx('iron_clink', 0.35)
  }

  const doApex = () => {
    if (!selectedBeast || selectedBeast.side !== 'player') return
    setState((s) => triggerApexOrBank(s, selectedBeast.slot))
    playSfx('apex_kill', 0.55)
  }

  const doBless = () => {
    if (
      !selectedBeast ||
      selectedBeast.side !== 'player' ||
      state.player.binderId !== 1
    )
      return
    setState((s) => useBinderAbility(s, selectedBeast.slot))
  }

  const enemyName = cardById(state.enemy.binderId).name
  const playerName = cardById(state.player.binderId).name
  const handCount = state.player.hand.length
  const phaseLabel = PHASE_LABEL[state.phase] ?? state.phase.toUpperCase()

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0c] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.12),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(251,146,60,0.1),transparent_40%)]" />

      {/* Phase banner */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div
          className={[
            'px-4 py-1 rounded-full text-[0.65rem] font-black tracking-[0.2em]',
            'border backdrop-blur-sm',
            state.phase === 'hunt'
              ? 'bg-rose-900/70 border-rose-400/50 text-rose-200'
              : state.phase === 'dawn'
                ? 'bg-sky-900/70 border-sky-400/50 text-sky-200'
                : state.phase === 'dusk'
                  ? 'bg-violet-900/70 border-violet-400/50 text-violet-200'
                  : 'bg-black/60 border-white/20 text-white/80',
          ].join(' ')}
        >
          {phaseLabel}
          {state.active !== 'player' && state.phase !== 'gameover'
            ? ' · ENEMY'
            : ''}
        </div>
      </div>

      {/* Combat toast */}
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-slide-up">
          <div
            className={[
              'px-4 py-2 rounded-2xl font-bold text-sm shadow-xl border max-w-[90vw] text-center',
              toast.kind === 'damage' || toast.kind === 'kill'
                ? 'bg-rose-950/90 border-rose-400/60 text-rose-100'
                : toast.kind === 'enter'
                  ? 'bg-amber-950/90 border-amber-400/50 text-amber-100'
                  : toast.kind === 'phase'
                    ? 'bg-sky-950/90 border-sky-400/50 text-sky-100 tracking-widest'
                    : 'bg-stone-900/90 border-white/20 text-white',
            ].join(' ')}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* Enemy header — tapable face when attacking */}
      <header className="relative z-10 px-3 pt-2 pb-1 shrink-0">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onQuit}
            className="mt-0.5 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm"
            aria-label="Close"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={onFaceEnemy}
            className={[
              'flex-1 min-w-0 text-left rounded-xl p-1 -m-1 transition',
              faceLegal
                ? 'ring-4 ring-rose-400 bg-rose-500/25 shadow-[0_0_24px_rgba(251,113,133,0.55)] animate-pulse scale-[1.02]'
                : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-900 border-2 border-violet-300/40 flex items-center justify-center text-lg shadow-lg shrink-0 overflow-hidden">
                {cardById(state.enemy.binderId).art ? (
                  <img
                    src={
                      cardById(state.enemy.binderId).art!.startsWith('/')
                        ? `${import.meta.env.BASE_URL}${cardById(state.enemy.binderId).art!.slice(1)}`
                        : cardById(state.enemy.binderId).art!
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  '💀'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold text-[0.8rem] leading-tight">
                    {enemyName}
                  </div>
                  <div className="text-sm font-black text-fuchsia-300 shrink-0">
                    {state.enemy.binderHp} HP
                  </div>
                </div>
                <HpBar
                  hp={state.enemy.binderHp}
                  max={BINDER_MAX_HP}
                  gradient="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-400"
                />
                {faceLegal && (
                  <div className="text-[0.7rem] text-rose-200 font-black mt-1 tracking-wide">
                    ⚡ TAP HERE — STRIKE BINDER
                  </div>
                )}
              </div>
            </div>
          </button>
          <button
            type="button"
            className="mt-0.5 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm"
            aria-label="Menu"
          >
            ⋮
          </button>
        </div>
      </header>

      {/* Battlefield */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-2 gap-1.5 justify-center">
        <div className="flex gap-2 items-stretch pr-10">
          {state.enemy.beasts.map((b, i) => (
            <BoardSlot
              key={`e${i}`}
              beast={b}
              side="enemy"
              selected={!!b && b.uid === state.selectedBeastUid}
              targetable={
                !!(
                  attacking &&
                  b &&
                  isValidAttackTarget(state, state.attackSourceUid!, {
                    kind: 'beast',
                    uid: b.uid,
                  })
                )
              }
              damageFlash={b ? dmgFlash[b.uid] : null}
              onTap={() => onSlotEnemy(i)}
            />
          ))}
        </div>

        <div className="relative flex items-center justify-center min-h-[2.2rem] px-10">
          <p className="text-[0.7rem] text-white/50 text-center leading-snug line-clamp-2">
            {state.phase === 'gameover'
              ? state.winReason
              : attacking
                ? hasEnemyGuard(state, 'enemy')
                  ? 'Strike a Guardian first.'
                  : 'Tap an enemy beast or their Binder.'
                : state.active !== 'player'
                  ? busy
                    ? 'Enemy is hunting…'
                    : 'Enemy turn…'
                  : hint}
          </p>
          {state.phase !== 'gameover' && state.active === 'player' && (
            <button
              type="button"
              onClick={() => {
                if (attacking) {
                  setState((s) => cancelAttack(s))
                  return
                }
                if (state.phase === 'main') playSfx('dawn_horn', 0.4)
                else playSfx('surge_bolt', 0.35)
                setState((s) => endTurn(s))
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 end-turn-btn"
            >
              <span className="end-turn-label">
                {attacking ? 'Cancel' : 'End Turn'}
              </span>
            </button>
          )}
        </div>

        <div className="flex gap-2 items-stretch pr-10">
          {state.player.beasts.map((b, i) => (
            <BoardSlot
              key={`p${i}`}
              beast={b}
              side="player"
              droppable={!!(waitingPlay && !b && state.selectedHand !== null && canPlayToSlot(state, state.selectedHand, i))}
              selected={
                !!b &&
                (b.uid === state.selectedBeastUid ||
                  b.uid === state.attackSourceUid)
              }
              damageFlash={b ? dmgFlash[b.uid] : null}
              onTap={() => onSlotPlayer(i)}
            />
          ))}
        </div>
      </div>

      {/* Action row */}
      {(selectedBeast?.side === 'player' ||
        (selectedCard &&
          selectedCard.type !== 'beast' &&
          state.phase === 'main')) &&
        state.phase !== 'gameover' &&
        state.active === 'player' &&
        !attacking && (
          <div className="relative z-20 mx-3 mb-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#2a1f14]/95 border-2 border-orange-500/70 shadow-[0_0_20px_rgba(251,146,60,0.35)]">
              {selectedBeast ? (
                <>
                  <button
                    type="button"
                    onClick={doAttack}
                    className="action-chip"
                    disabled={!canBeastAttack(state, selectedBeast)}
                  >
                    <span>⚔️</span> Attack
                  </button>
                  <button type="button" onClick={doGuard} className="action-chip">
                    <span>🛡️</span>{' '}
                    {selectedBeast.guarding ? 'Unguard' : 'Guard'}
                  </button>
                  <button
                    type="button"
                    onClick={doApex}
                    className="action-chip action-chip-apex"
                  >
                    <span>🔥</span> Apex
                  </button>
                  {state.player.binderId === 1 &&
                    !state.player.binderAbilityUsed && (
                      <button
                        type="button"
                        onClick={doBless}
                        className="action-chip"
                      >
                        ✨ Bless
                      </button>
                    )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={playNonBeast}
                  className="action-chip action-chip-apex"
                >
                  Play {selectedCard!.name}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    selectedBeastUid: null,
                    selectedHand: null,
                    uiMode: 'idle',
                    attackSourceUid: null,
                  }))
                }
                className="w-7 h-7 rounded-full bg-black/40 border border-white/20 text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

      {/* Hand fan */}
      <div className="relative z-10 shrink-0 h-[7.8rem] overflow-visible">
        <div className="absolute inset-x-0 bottom-0 flex justify-center items-end h-full px-2">
          {state.player.hand.map((id, i) => {
            const card = cardById(id)
            const affordable =
              state.phase === 'main' &&
              state.active === 'player' &&
              state.player.storm >= card.cost
            const mid = (handCount - 1) / 2
            const offset = i - mid
            const rot = offset * 6
            const y = Math.abs(offset) * 4
            return (
              <div
                key={`${id}-${i}`}
                className="relative"
                style={{
                  marginLeft: i === 0 ? 0 : -28,
                  zIndex: state.selectedHand === i ? 40 : 10 + i,
                  transform: `rotate(${rot}deg) translateY(${state.selectedHand === i ? -18 : y}px)`,
                }}
              >
                <CardFace
                  card={card}
                  size="hand"
                  selected={state.selectedHand === i}
                  dimmed={
                    (!affordable && state.phase === 'main') || attacking
                  }
                  onClick={() => {
                    if (attacking) {
                      setState((s) => cancelAttack(s))
                      return
                    }
                    if (state.phase === 'gameover') {
                      openInspect(card, setInspect)
                      return
                    }
                    if (state.selectedHand === i) {
                      openInspect(card, setInspect)
                    } else {
                      setState((s) => selectHand(s, i))
                      setHint(
                        card.type === 'beast'
                          ? `Tap an Open Slot to summon ${card.name}.`
                          : `Play ${card.name} from the action bar.`,
                      )
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Player footer */}
      <div className="relative z-10 shrink-0 px-3 pb-1 pt-1">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-700 border-2 border-orange-300/50 flex items-center justify-center text-lg shadow-lg shrink-0 overflow-hidden">
              {cardById(state.player.binderId).art ? (
                <img
                  src={
                    cardById(state.player.binderId).art!.startsWith('/')
                      ? `${import.meta.env.BASE_URL}${cardById(state.player.binderId).art!.slice(1)}`
                      : cardById(state.player.binderId).art!
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                '🛡️'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-[0.8rem] leading-tight line-clamp-1">
                  {playerName}
                </div>
                <div className="text-sm font-black text-orange-300 shrink-0">
                  {state.player.binderHp} HP
                </div>
              </div>
              <HpBar
                hp={state.player.binderHp}
                max={BINDER_MAX_HP}
                gradient="bg-gradient-to-r from-orange-600 via-amber-400 to-yellow-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 border border-sky-400/30">
              <span className="text-sky-300 text-sm drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]">
                ⚡
              </span>
              <span className="text-xs font-black text-sky-200 tabular-nums">
                {state.player.storm}/{state.player.stormCap}
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 border border-orange-400/30">
              <span className="text-orange-400 text-sm">🔥</span>
              <span className="text-xs font-black text-orange-200 tabular-nums">
                {state.player.stormCharges}/3
              </span>
            </div>
          </div>
        </div>
        {state.player.relics.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {state.player.relics.map((r) => (
              <span
                key={r.uid}
                className="text-[0.5rem] px-1.5 py-0.5 rounded bg-white/10 text-white/60"
              >
                {cardById(r.cardId).name}
                {r.usedThisTurn ? ' ✓' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {state.phase === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-3xl border border-orange-400/40 bg-[#1a1410] p-6 text-center space-y-3 shadow-[0_0_40px_rgba(251,146,60,0.3)]">
            <div className="text-3xl font-black">
              {state.winner === 'player' ? 'Victory!' : 'Defeat'}
            </div>
            <div className="text-sm text-white/70">{state.winReason}</div>
            <button
              type="button"
              onClick={onQuit}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 font-bold text-black"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

      {inspect && (
        <InspectOverlay card={inspect} onClose={() => setInspect(null)} />
      )}
    </div>
  )
}
