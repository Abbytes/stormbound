import { useEffect, useRef, useState } from 'react'
import {
  createTutorialGame,
  playCard,
  selectHand,
  selectBeast,
  endTurn,
  toggleAttack,
  runEnemyTurn,
  bankStormCharge,
  useBinderAbility,
  useStormCrown,
  useKeepHorn,
  canPlayToSlot,
  BINDER_MAX_HP,
  type GameState,
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

function shortName(name: string): string {
  // Keep full binder names — they fit the reference style
  return name
}

export function BattleScreen({ faction, onQuit }: Props) {
  const [state, setState] = useState<GameState>(() => createTutorialGame(faction))
  const [inspect, setInspect] = useState<CardDef | null>(null)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('The gates open. Summon a beast from your hand.')
  const prevLogLen = useRef(0)

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
        if (
          state.playerFaction === 'pack' ||
          lower.includes('pack') ||
          lower.includes('wraith') ||
          lower.includes('ossuary') ||
          lower.includes('howl')
        )
          playSfx('bond')
        else playSfx('iron_clink')
      } else if (lower.includes('dawn —')) playSfx('dawn_horn', 0.4)
      else if (lower.includes('howl tyrant')) playSfx('pack_howl')
    }
    if (msgs.length) setHint(msgs[msgs.length - 1])
  }, [state.log, state.playerFaction])

  useEffect(() => {
    if (state.active !== 'enemy' || state.phase === 'gameover' || busy) return
    setBusy(true)
    const t = setTimeout(() => {
      setState((s) => runEnemyTurn(s))
      setBusy(false)
    }, 700)
    return () => clearTimeout(t)
  }, [state.active, state.phase, state.turn, busy])

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
    state.player.beasts.some(
      (b, i) => !b && canPlayToSlot(state, state.selectedHand!, i),
    )

  const onSlotPlayer = (slot: number) => {
    if (waitingPlay && state.selectedHand !== null) {
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
        setHint(`${c.name} enters the field.`)
      }
      setState(next)
      return
    }
    const beast = state.player.beasts[slot]
    if (state.phase === 'hunt' && state.huntStep === 'declare' && beast) {
      setState((s) => toggleAttack(s, slot))
      setHint(
        beast.attacking
          ? `${cardById(beast.cardId).name} stands down.`
          : `${cardById(beast.cardId).name}: ready to Attack.`,
      )
      return
    }
    if (state.phase === 'main' && state.active === 'player' && beast) {
      if (
        state.player.binderId === 1 &&
        !state.player.binderAbilityUsed &&
        state.player.storm >= 1 &&
        cardById(beast.cardId).faction === 'dawn'
      ) {
        // first tap selects; double via action row for bless — just select
      }
      setState((s) => selectBeast(s, beast.uid))
      setHint(
        `${cardById(beast.cardId).name}: attack, guard, or unleash Apex.`,
      )
      return
    }
    if (beast) openInspect(cardById(beast.cardId), setInspect)
  }

  const onSlotEnemy = (slot: number) => {
    if (state.phase === 'main' && state.active === 'player') {
      const hasCrown = state.player.relics.some(
        (r) => r.cardId === 20 && !r.usedThisTurn,
      )
      const hasHorn = state.player.relics.some(
        (r) => r.cardId === 28 && !r.usedThisTurn,
      )
      if (hasHorn && state.enemy.beasts[slot]) {
        setState((s) => useKeepHorn(s, 'enemy', slot))
        return
      }
      if (hasCrown && state.enemy.beasts[slot]?.huntMarked) {
        setState((s) => useStormCrown(s, 'enemy', slot))
        playSfx('surge_bolt')
        return
      }
    }
    const beast = state.enemy.beasts[slot]
    if (beast) {
      setState((s) => selectBeast(s, beast.uid))
      openInspect(cardById(beast.cardId), setInspect)
    }
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
    if (state.phase === 'hunt' && state.huntStep === 'declare') {
      setState((s) => toggleAttack(s, selectedBeast.slot))
      setHint(`${cardById(selectedBeast.cardId).name} — Attack toggled.`)
      return
    }
    if (state.phase === 'main') {
      setHint('Begin Hunt (End Turn) to declare Attack.')
    }
  }

  const doGuard = () => {
    if (!selectedBeast) return
    setHint(
      `${cardById(selectedBeast.cardId).name} stands Guard (${selectedBeast.def} DEF).`,
    )
    playSfx('iron_clink', 0.35)
  }

  const doApex = () => {
    if (selectedBeast && selectedBeast.side === 'player') {
      const c = cardById(selectedBeast.cardId)
      if (c.keywords.includes('apex')) {
        if (selectedBeast.apexUsed) {
          setHint(`${c.name}'s Apex already unleashed.`)
        } else {
          setHint(`${c.name} Apex triggers on summon — already resolved or pending.`)
        }
      }
    }
    // Bank storm charge as Apex power sink
    if (state.player.storm >= 3) {
      setState((s) => bankStormCharge(s))
      playSfx('apex_kill', 0.45)
      setHint('Apex power banked!')
    } else {
      setHint('Need 3 Storm to bank Apex power.')
    }
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

  const enemyName = shortName(cardById(state.enemy.binderId).name)
  const playerName = shortName(cardById(state.player.binderId).name)
  const handCount = state.player.hand.length

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0c] text-white relative overflow-hidden">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.12),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(251,146,60,0.1),transparent_40%)]" />

      {/* Enemy header */}
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-900 border-2 border-violet-300/40 flex items-center justify-center text-lg shadow-lg shrink-0">
                💀
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold text-[0.8rem] leading-tight">{enemyName}</div>
                  <div className="text-sm font-black text-fuchsia-300 shrink-0">
                    {state.enemy.binderHp} HP
                  </div>
                </div>
                <HpBar
                  hp={state.enemy.binderHp}
                  max={BINDER_MAX_HP}
                  gradient="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-400"
                />
              </div>
            </div>
          </div>
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
        {/* Enemy row */}
        <div className="flex gap-2 items-stretch pr-10">
          {state.enemy.beasts.map((b, i) => (
            <BoardSlot
              key={`e${i}`}
              beast={b}
              side="enemy"
              selected={!!b && b.uid === state.selectedBeastUid}
              onTap={() => onSlotEnemy(i)}
            />
          ))}
        </div>

        {/* Hint + End Turn */}
        <div className="relative flex items-center justify-center min-h-[2.2rem] px-10">
          <p className="text-[0.7rem] text-white/50 text-center leading-snug line-clamp-2">
            {state.phase === 'gameover'
              ? state.winReason
              : state.active !== 'player'
                ? 'Enemy is hunting…'
                : hint}
          </p>
          {state.phase !== 'gameover' && state.active === 'player' && (
            <button
              type="button"
              onClick={() => {
                if (state.phase === 'main') playSfx('dawn_horn', 0.25)
                else playSfx('surge_bolt', 0.35)
                setState((s) => endTurn(s))
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 end-turn-btn"
            >
              <span className="end-turn-label">End Turn</span>
            </button>
          )}
        </div>

        {/* Player row */}
        <div className="flex gap-2 items-stretch pr-10">
          {state.player.beasts.map((b, i) => (
            <BoardSlot
              key={`p${i}`}
              beast={b}
              side="player"
              droppable={!!(waitingPlay && !b)}
              selected={!!b && b.uid === state.selectedBeastUid}
              onTap={() => onSlotPlayer(i)}
            />
          ))}
        </div>
      </div>

      {/* Selected action row */}
      {(selectedBeast ||
        (selectedCard && selectedCard.type !== 'beast' && state.phase === 'main')) &&
        state.phase !== 'gameover' &&
        state.active === 'player' && (
          <div className="relative z-20 mx-3 mb-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[#2a1f14]/95 border-2 border-orange-500/70 shadow-[0_0_20px_rgba(251,146,60,0.35)]">
              {selectedBeast ? (
                <>
                  <button
                    type="button"
                    onClick={doAttack}
                    className="action-chip"
                  >
                    <span>⚔️</span> Attack
                  </button>
                  <button type="button" onClick={doGuard} className="action-chip">
                    <span>🛡️</span> Guard
                  </button>
                  <button
                    type="button"
                    onClick={doApex}
                    className="action-chip action-chip-apex"
                  >
                    <span>🔥</span> Apex
                  </button>
                  {state.player.binderId === 1 &&
                    selectedBeast.side === 'player' &&
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
                  dimmed={!affordable && state.phase === 'main'}
                  onClick={() => {
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-700 border-2 border-orange-300/50 flex items-center justify-center text-lg shadow-lg shrink-0">
              🛡️
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-[0.8rem] leading-tight line-clamp-1">{playerName}</div>
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

      {/* Game over overlay */}
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
