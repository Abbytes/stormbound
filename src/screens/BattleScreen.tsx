import { useEffect, useRef, useState } from 'react'
import {
  createTutorialGame,
  playCard,
  selectHand,
  endMainPhase,
  confirmAttackers,
  skipHunt,
  toggleAttack,
  runEnemyTurn,
  bankStormCharge,
  useBinderAbility,
  useStormCrown,
  useKeepHorn,
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

export function BattleScreen({ faction, onQuit }: Props) {
  const [state, setState] = useState<GameState>(() => createTutorialGame(faction))
  const [inspect, setInspect] = useState<CardDef | null>(null)
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const prevLogLen = useRef(0)

  const playerGlow = state.playerFaction
  const enemyGlow = state.playerFaction === 'dawn' ? 'pack' : 'dawn'

  // SFX from log deltas
  useEffect(() => {
    const msgs = state.log.slice(prevLogLen.current)
    prevLogLen.current = state.log.length
    for (const m of msgs) {
      const lower = m.toLowerCase()
      if (lower.includes('apex')) playSfx('apex_kill')
      else if (lower.includes('surge') || lower.includes('chain bolt') || lower.includes('lightning'))
        playSfx('surge_bolt')
      else if (lower.includes('bond')) {
        if (state.playerFaction === 'pack' || lower.includes('pack') || lower.includes('wraith') || lower.includes('ossuary') || lower.includes('howl'))
          playSfx('bond')
        else playSfx('iron_clink')
      } else if (lower.includes('dawn —')) playSfx('dawn_horn', 0.4)
      else if (lower.includes('howl tyrant')) playSfx('pack_howl')
    }
  }, [state.log, state.playerFaction])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [state.log])

  // Auto-run enemy turn
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
    state.selectedHand !== null ? cardById(state.player.hand[state.selectedHand]) : null
  const waitingPlay =
    state.phase === 'main' &&
    state.active === 'player' &&
    selectedCard?.type === 'beast'

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
      }
      setState(next)
      return
    }
    if (state.phase === 'hunt' && state.huntStep === 'declare') {
      setState((s) => toggleAttack(s, slot))
      return
    }
    if (state.phase === 'main' && state.active === 'player') {
      // binder ability target
      if (state.player.binderId === 1 && !state.player.binderAbilityUsed && state.player.storm >= 1) {
        const b = state.player.beasts[slot]
        if (b && cardById(b.cardId).faction === 'dawn') {
          setState((s) => useBinderAbility(s, slot))
          return
        }
      }
      const beast = state.player.beasts[slot]
      if (beast) openInspect(cardById(beast.cardId), setInspect)
    }
  }

  const onSlotEnemy = (slot: number) => {
    if (state.phase === 'main' && state.active === 'player') {
      // Storm Crown / Keep Horn targeting
      const hasCrown = state.player.relics.some((r) => r.cardId === 20 && !r.usedThisTurn)
      const hasHorn = state.player.relics.some((r) => r.cardId === 28 && !r.usedThisTurn)
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
    if (beast) openInspect(cardById(beast.cardId), setInspect)
  }

  const playNonBeast = () => {
    if (state.selectedHand === null || !selectedCard) return
    if (selectedCard.type === 'beast') return
    const next = playCard(state, state.selectedHand, 0)
    if (selectedCard.type === 'storm') playSfx('surge_bolt')
    else playSfx('iron_clink', 0.35)
    setState(next)
  }

  const phaseLabel =
    state.phase === 'gameover'
      ? 'Battle Over'
      : state.active !== 'player'
        ? 'Enemy turn…'
        : state.phase === 'main'
          ? 'Main — play cards'
          : state.phase === 'hunt'
            ? state.huntStep === 'declare'
              ? 'Hunt — tap attackers'
              : 'Resolving Hunt…'
            : state.phase

  return (
    <div className="min-h-dvh flex flex-col bg-[#0a0e1a] text-white max-w-lg mx-auto">
      {/* Top bar */}
      <header className="flex items-center justify-between px-3 pt-3 pb-1 gap-2">
        <button type="button" onClick={onQuit} className="text-xs px-2 py-1.5 rounded-lg bg-white/10">
          Quit
        </button>
        <div className="flex-1 text-center">
          <div className="text-[0.6rem] uppercase tracking-widest text-white/40">Turn {state.turn}</div>
          <div className="text-sm font-bold capitalize text-cyan-200">{phaseLabel}</div>
        </div>
        <div className="text-right text-xs">
          <div className="text-amber-300">⚡ {state.player.stormCharges}/3</div>
        </div>
      </header>

      {/* Enemy binder */}
      <div className="mx-3 mt-1 rounded-2xl border border-violet-500/30 bg-violet-950/40 px-3 py-2 flex items-center justify-between">
        <div>
          <div className="text-[0.6rem] uppercase text-violet-300/70 tracking-wider">Rival Binder</div>
          <div className="font-bold text-sm">{cardById(state.enemy.binderId).name}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-rose-300">{state.enemy.binderHp} HP</div>
          <div className="text-[0.65rem] text-violet-200">Storm {state.enemy.storm} · ⚡{state.enemy.stormCharges}</div>
        </div>
      </div>

      {/* Enemy relics */}
      {state.enemy.relics.length > 0 && (
        <div className="px-3 mt-1 flex gap-1 justify-end">
          {state.enemy.relics.map((r) => (
            <span key={r.uid} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
              {cardById(r.cardId).name}
            </span>
          ))}
        </div>
      )}

      {/* Enemy floor */}
      <div className="px-2 mt-2">
        <div className="text-[0.55rem] uppercase tracking-widest text-white/30 mb-1 px-1">Enemy floor</div>
        <div className="flex gap-1.5 ashfall-floor rounded-xl p-1.5">
          {state.enemy.beasts.map((b, i) => (
            <BoardSlot
              key={`e${i}`}
              beast={b}
              side="enemy"
              slot={i}
              glow={enemyGlow}
              onTap={() => onSlotEnemy(i)}
            />
          ))}
        </div>
      </div>

      {/* Log */}
      <div
        ref={logRef}
        className="mx-3 my-2 h-14 overflow-y-auto rounded-xl bg-black/40 border border-white/5 px-2 py-1 text-[0.65rem] text-white/60 space-y-0.5"
      >
        {state.log.slice(-8).map((l, i) => (
          <div key={`${i}-${l}`}>{l}</div>
        ))}
      </div>

      {/* Player floor */}
      <div className="px-2">
        <div className="text-[0.55rem] uppercase tracking-widest text-white/30 mb-1 px-1">Your floor</div>
        <div className="flex gap-1.5 ashfall-floor rounded-xl p-1.5">
          {state.player.beasts.map((b, i) => (
            <BoardSlot
              key={`p${i}`}
              beast={b}
              side="player"
              slot={i}
              glow={playerGlow}
              droppable={!!(waitingPlay && !b)}
              onTap={() => onSlotPlayer(i)}
              onDrop={() => onSlotPlayer(i)}
            />
          ))}
        </div>
      </div>

      {/* Player binder + storm */}
      <div className="mx-3 mt-2 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 flex items-center justify-between">
        <div>
          <div className="text-[0.6rem] uppercase text-cyan-300/70 tracking-wider">Your Binder</div>
          <div className="font-bold text-sm">{cardById(state.player.binderId).name}</div>
          {state.player.relics.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {state.player.relics.map((r) => (
                <span key={r.uid} className="text-[0.5rem] px-1 py-0.5 rounded bg-white/10">
                  {cardById(r.cardId).name}
                  {r.usedThisTurn ? ' ✓' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-emerald-300">{state.player.binderHp} HP</div>
          <div className="text-cyan-200 font-bold">⚡ Storm {state.player.storm}</div>
        </div>
      </div>

      {/* Hand */}
      <div className="mt-2 px-2 overflow-x-auto">
        <div className="flex gap-2 pb-1 min-h-[8rem] items-end">
          {state.player.hand.map((id, i) => {
            const card = cardById(id)
            const affordable =
              state.phase === 'main' &&
              state.active === 'player' &&
              state.player.storm >= card.cost
            return (
              <CardFace
                key={`${id}-${i}`}
                card={card}
                size="sm"
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
                  }
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-3 flex flex-wrap gap-2 border-t border-white/5 bg-black/30">
        {state.phase === 'gameover' ? (
          <div className="w-full text-center space-y-2">
            <div className="text-xl font-black">
              {state.winner === 'player' ? 'Victory!' : 'Defeat'}
            </div>
            <div className="text-sm text-white/70">{state.winReason}</div>
            <button
              type="button"
              onClick={onQuit}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 font-bold"
            >
              Return Home
            </button>
          </div>
        ) : (
          <>
            {selectedCard && selectedCard.type !== 'beast' && state.phase === 'main' && state.active === 'player' && (
              <button
                type="button"
                onClick={playNonBeast}
                className="flex-1 py-3 rounded-xl bg-violet-600 font-bold text-sm"
              >
                Play {selectedCard.name}
              </button>
            )}
            {state.phase === 'main' && state.active === 'player' && (
              <>
                <button
                  type="button"
                  onClick={() => setState((s) => bankStormCharge(s))}
                  disabled={state.player.storm < 3}
                  className="px-3 py-3 rounded-xl bg-amber-700/80 font-bold text-sm disabled:opacity-30"
                >
                  Bank ⚡ (3)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setState((s) => endMainPhase(s))
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 font-bold text-sm"
                >
                  Begin Hunt →
                </button>
              </>
            )}
            {state.phase === 'hunt' && state.huntStep === 'declare' && state.active === 'player' && (
              <>
                <button
                  type="button"
                  onClick={() => setState((s) => skipHunt(s))}
                  className="px-3 py-3 rounded-xl bg-white/10 font-bold text-sm"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('surge_bolt', 0.35)
                    setState((s) => confirmAttackers(s))
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-600 font-bold text-sm"
                >
                  Confirm Attackers
                </button>
              </>
            )}
            {state.active === 'enemy' && (
              <div className="flex-1 py-3 text-center text-sm text-white/50 animate-pulse">
                Enemy is hunting…
              </div>
            )}
          </>
        )}
      </div>

      {inspect && <InspectOverlay card={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}
