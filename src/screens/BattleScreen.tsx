import { useCallback, useEffect, useMemo, useState } from 'react'
import { cardById } from '../data/cards'
import { playSfx } from '../game/audio'
import {
  advanceTutorial,
  attachEnergy,
  attackWith,
  beginAttachMode,
  beginRetreatMode,
  canEvolveOnto,
  canPlayBasicTo,
  createGame,
  endTurn,
  evolveOnto,
  playBasicTo,
  playerPromote,
  retreatToBench,
  selectHand,
  startBattle,
  usableAttacks,
  consumeSfx,
  type GameState,
} from '../game/engine'
import { BoardMonCard, InspectCard, MiniCard } from '../components/CardFace'
import { EnergyCostIcons } from '../components/EnergyPips'
import type { SfxName } from '../game/audio'

const TUTORIAL: string[] = [
  'Put a Basic beast from your hand into the Active Spot!',
  'You can also Bench Basics (optional), then tap Start Battle.',
  'Tap the ⚡ button, then your Active (or Bench) to attach Energy.',
  'Tap Attack when your Active has enough ⚡, then End Turn.',
  'First to 3 points wins. Apex KO = 2 pts. Good luck!',
]

function PointTrack({ points, label }: { points: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] uppercase tracking-wider text-white/50">{label}</span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${
              i < points
                ? 'bg-amber-400 border-amber-200 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                : 'bg-black/30 border-white/25 text-white/30'
            }`}
          >
            {i < points ? '●' : i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptySlot({
  glow,
  label,
  onClick,
  size = 'md',
}: {
  glow?: boolean
  label: string
  onClick?: () => void
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-[3.6rem] h-[5rem]' : 'w-[5.5rem] h-[7.6rem]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${dim} rounded-2xl border-2 border-dashed flex items-center justify-center text-[10px] font-bold text-center px-1 ${
        glow
          ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse'
          : 'border-white/20 bg-black/20 text-white/35'
      }`}
    >
      {label}
    </button>
  )
}

function SpeechBubble({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="absolute z-30 left-3 right-3 top-14 mx-auto max-w-sm pointer-events-auto">
      <div className="relative bg-white text-slate-900 rounded-2xl px-4 py-3 text-sm font-semibold leading-snug shadow-xl text-left">
        {text}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-[11px] font-bold text-sky-700 underline"
        >
          Got it
        </button>
        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white rotate-45" />
      </div>
    </div>
  )
}

export function BattleScreen({ onQuit }: { onQuit: () => void }) {
  const [game, setGame] = useState<GameState>(() => createGame())
  const [inspectId, setInspectId] = useState<string | null>(null)

  const flushSfx = (sfx: string[]) => {
    for (const name of sfx) {
      playSfx(name as SfxName, name.startsWith('ko') || name === 'win_sting' ? 0.7 : 0.55)
    }
  }

  const apply = useCallback((fn: (g: GameState) => GameState, sfx?: SfxName) => {
    setGame((g) => {
      const next = fn(g)
      if (next === g) return g
      const { state, sfx: queued } = consumeSfx(next)
      const all = sfx ? [sfx, ...queued] : queued
      // defer audio outside reducer
      queueMicrotask(() => flushSfx(all))
      return state
    })
  }, [])

  // Auto-clear toasts
  useEffect(() => {
    if (game.toasts.length === 0) return
    const t = setTimeout(() => {
      setGame((g) => ({ ...g, toasts: g.toasts.slice(1) }))
    }, 1800)
    return () => clearTimeout(t)
  }, [game.toasts])

  const selectedCardId =
    game.selectedHand !== null ? game.player.hand[game.selectedHand] : null
  const selectedDef = selectedCardId ? cardById(selectedCardId) : null

  const glowingActive =
    game.uiMode === 'placeBasic' &&
    selectedDef?.stage === 'basic' &&
    !game.player.active

  const glowingBench = (i: number) => {
    if (game.uiMode === 'retreat') return !!game.player.bench[i]
    if (game.uiMode === 'attachEnergy') return !!game.player.bench[i]
    if (game.uiMode === 'promotePick') return !!game.player.bench[i]
    if (game.selectedHand === null) return false
    if (selectedDef?.stage === 'basic') {
      return canPlayBasicTo(game, game.selectedHand, i) && !!game.player.active
    }
    if (selectedDef?.evoFrom) {
      return canEvolveOnto(game, game.selectedHand, i)
    }
    return false
  }

  const glowingActiveForAction = useMemo(() => {
    if (glowingActive) return true
    if (game.uiMode === 'attachEnergy' && game.player.active) return true
    if (
      game.selectedHand !== null &&
      selectedDef?.evoFrom &&
      canEvolveOnto(game, game.selectedHand, 'active')
    )
      return true
    return false
  }, [game, glowingActive, selectedDef])

  const onSlot = (target: 'active' | number) => {
    if (game.phase === 'promote' && game.uiMode === 'promotePick' && target !== 'active') {
      apply((g) => playerPromote(g, target), 'place_card')
      return
    }
    if (game.uiMode === 'attachEnergy') {
      apply((g) => attachEnergy(g, target))
      return
    }
    if (game.uiMode === 'retreat' && target !== 'active') {
      apply((g) => retreatToBench(g, target), 'place_card')
      return
    }
    if (game.selectedHand === null) {
      // Inspect board mon
      const mon =
        target === 'active'
          ? game.player.active
          : game.player.bench[target]
      if (mon) {
        playSfx('inspect_chime', 0.4)
        setInspectId(mon.cardId)
      }
      return
    }
    if (selectedDef?.stage === 'basic' && canPlayBasicTo(game, game.selectedHand, target)) {
      apply((g) => playBasicTo(g, target))
      return
    }
    if (selectedDef?.evoFrom && canEvolveOnto(game, game.selectedHand, target)) {
      apply((g) => evolveOnto(g, target))
      return
    }
  }

  const attacks = usableAttacks(game.player.active)
  const canStart = game.phase === 'setup' && !!game.player.active

  return (
    <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden pocket-playmat">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1 z-20">
        <button
          type="button"
          onClick={onQuit}
          className="text-xs font-bold px-2 py-1 rounded-lg bg-black/35 border border-white/15"
        >
          ← Quit
        </button>
        <div className="text-[10px] font-semibold text-white/70">
          {game.phase === 'setup'
            ? 'Setup'
            : game.phase === 'gameover'
              ? 'Game Over'
              : game.phase === 'promote'
                ? 'Promote!'
                : game.active === 'player'
                  ? `Your Turn ${game.turn}`
                  : 'Enemy Turn…'}
        </div>
        <div className="w-12" />
      </div>

      {/* Points */}
      <div className="shrink-0 flex justify-center gap-8 py-1 z-20">
        <PointTrack points={game.enemy.points} label="Enemy" />
        <PointTrack points={game.player.points} label="You" />
      </div>

      {game.tutorialStep < TUTORIAL.length && game.phase !== 'gameover' && (
        <SpeechBubble
          text={TUTORIAL[game.tutorialStep]}
          onDismiss={() => apply(advanceTutorial)}
        />
      )}

      {/* Board */}
      <div className="flex-1 min-h-0 relative flex flex-col px-2">
        {/* Enemy half */}
        <div className="flex-1 flex flex-col items-center justify-end pb-1 gap-2 min-h-0">
          {/* Enemy bench (above active) */}
          <div className="flex gap-2 items-end">
            {game.enemy.bench.map((m, i) =>
              m ? (
                <BoardMonCard
                  key={m.uid}
                  cardId={m.cardId}
                  hp={m.hp}
                  maxHp={m.maxHp}
                  energy={m.energy}
                  small
                  onClick={() => {
                    playSfx('inspect_chime', 0.35)
                    setInspectId(m.cardId)
                  }}
                />
              ) : (
                <EmptySlot key={i} label="Bench" size="sm" />
              ),
            )}
          </div>
          {/* Enemy active + decks */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-lg bg-violet-950/80 border border-violet-400/30 flex items-center justify-center text-[9px] text-violet-200/70 font-bold">
              Deck
              <br />
              {game.enemy.deck.length}
            </div>
            {game.enemy.active ? (
              <BoardMonCard
                cardId={game.enemy.active.cardId}
                hp={game.enemy.active.hp}
                maxHp={game.enemy.active.maxHp}
                energy={game.enemy.active.energy}
                onClick={() => {
                  playSfx('inspect_chime', 0.35)
                  setInspectId(game.enemy.active!.cardId)
                }}
              />
            ) : (
              <EmptySlot label="Active" />
            )}
            <div className="w-10 h-14 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center text-[9px] text-white/40 font-bold">
              Disc
              <br />
              {game.enemy.discard.length}
            </div>
          </div>
        </div>

        {/* Center divider */}
        <div className="shrink-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent my-1" />

        {/* Player half */}
        <div className="flex-1 flex flex-col items-center justify-start pt-1 gap-2 min-h-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-lg bg-amber-950/70 border border-amber-400/30 flex items-center justify-center text-[9px] text-amber-100/70 font-bold">
              Deck
              <br />
              {game.player.deck.length}
            </div>
            {game.player.active ? (
              <BoardMonCard
                cardId={game.player.active.cardId}
                hp={game.player.active.hp}
                maxHp={game.player.active.maxHp}
                energy={game.player.active.energy}
                glow={glowingActiveForAction}
                onClick={() => onSlot('active')}
              />
            ) : (
              <EmptySlot
                label={glowingActive ? 'Active Spot!' : 'Active'}
                glow={glowingActive}
                onClick={() => onSlot('active')}
              />
            )}
            <div className="w-10 h-14 rounded-lg bg-black/40 border border-white/15 flex items-center justify-center text-[9px] text-white/40 font-bold">
              Disc
              <br />
              {game.player.discard.length}
            </div>
          </div>
          {/* Player bench below active */}
          <div className="flex gap-2 items-start">
            {game.player.bench.map((m, i) =>
              m ? (
                <BoardMonCard
                  key={m.uid}
                  cardId={m.cardId}
                  hp={m.hp}
                  maxHp={m.maxHp}
                  energy={m.energy}
                  small
                  glow={glowingBench(i)}
                  onClick={() => onSlot(i)}
                />
              ) : (
                <EmptySlot
                  key={i}
                  label="Bench"
                  size="sm"
                  glow={
                    game.selectedHand !== null &&
                    selectedDef?.stage === 'basic' &&
                    canPlayBasicTo(game, game.selectedHand, i) &&
                    !!game.player.active
                  }
                  onClick={() => onSlot(i)}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="shrink-0 px-2 pb-1 flex items-end gap-2 z-20">
        <div className="flex-1 min-w-0 overflow-x-auto flex gap-1.5 py-1 hand-row">
          {game.player.hand.map((id, i) => (
            <MiniCard
              key={`${id}-${i}`}
              cardId={id}
              selected={game.selectedHand === i}
              onClick={() => {
                if (game.active !== 'player' && game.phase === 'main') return
                if (game.phase === 'promote') return
                playSfx('page_turn', 0.25)
                apply((g) => selectHand(g, g.selectedHand === i ? null : i))
              }}
            />
          ))}
          {game.player.hand.length === 0 && (
            <div className="text-[10px] text-white/35 py-6 px-2">No cards in hand</div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 items-end shrink-0 pb-1">
          {game.phase === 'setup' ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={() => apply(startBattle, 'pack_howl')}
              className={`px-3 py-2.5 rounded-2xl text-xs font-black ${
                canStart
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                  : 'bg-white/10 text-white/30'
              }`}
            >
              Start Battle
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={
                  game.phase !== 'main' ||
                  game.active !== 'player' ||
                  game.energyAttachedThisTurn
                }
                onClick={() => apply(beginAttachMode)}
                className={`w-12 h-12 rounded-full text-xl font-black border-2 ${
                  game.uiMode === 'attachEnergy'
                    ? 'bg-amber-400 border-amber-200 text-amber-950 scale-110'
                    : game.energyAttachedThisTurn
                      ? 'bg-white/10 border-white/15 text-white/30'
                      : 'bg-gradient-to-br from-yellow-300 to-amber-500 border-amber-200 text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                }`}
                title="Attach Energy"
              >
                ⚡
              </button>
              <button
                type="button"
                disabled={
                  game.phase !== 'main' ||
                  game.active !== 'player' ||
                  game.retreatedThisTurn ||
                  !game.player.bench.some(Boolean)
                }
                onClick={() => apply(beginRetreatMode)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                  game.uiMode === 'retreat'
                    ? 'bg-cyan-400/30 border-cyan-300 text-cyan-100'
                    : 'bg-black/40 border-white/20 text-white/70'
                }`}
              >
                Retreat
              </button>
              <button
                type="button"
                disabled={game.phase !== 'main' || game.active !== 'player'}
                onClick={() => apply(endTurn, 'page_turn')}
                className="px-2 py-1.5 rounded-lg text-[10px] font-black bg-orange-500/90 border border-orange-300/50 text-white"
              >
                End Turn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Attack bar */}
      {game.phase === 'main' &&
        game.active === 'player' &&
        game.player.active &&
        !game.attackedThisTurn && (
          <div className="shrink-0 px-2 pb-2 flex gap-2 overflow-x-auto">
            {attacks.map(({ attack, index, ready }) => (
              <button
                key={attack.name}
                type="button"
                disabled={!ready}
                onClick={() => apply((g) => attackWith(g, index))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left shrink-0 ${
                  ready
                    ? 'bg-rose-500/25 border-rose-300/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/35'
                }`}
              >
                <EnergyCostIcons cost={attack.energyCost} />
                <div>
                  <div className="text-xs font-bold">{attack.name}</div>
                  <div className="text-[10px] text-rose-200">{attack.damage} dmg</div>
                </div>
              </button>
            ))}
          </div>
        )}

      {/* Mode hints */}
      {game.uiMode === 'attachEnergy' && (
        <div className="absolute bottom-36 left-0 right-0 text-center text-xs font-bold text-amber-200 z-20">
          Tap Active or Bench to attach ⚡
        </div>
      )}
      {game.uiMode === 'retreat' && (
        <div className="absolute bottom-36 left-0 right-0 text-center text-xs font-bold text-cyan-200 z-20">
          Tap a Bench beast to switch in
        </div>
      )}
      {game.uiMode === 'promotePick' && (
        <div className="absolute bottom-36 left-0 right-0 text-center text-xs font-bold text-violet-200 z-20">
          Your Active was KO'd — pick a Bench beast!
        </div>
      )}
      {game.phase === 'setup' && selectedDef && selectedDef.stage !== 'basic' && (
        <div className="absolute bottom-36 left-0 right-0 text-center text-xs font-bold text-amber-200 z-20">
          Select a Basic — Stage cards evolve later
        </div>
      )}

      {/* Toasts */}
      <div className="absolute top-24 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-40">
        {game.toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
              t.kind === 'ko' || t.kind === 'win'
                ? 'bg-amber-400 text-amber-950'
                : t.kind === 'damage'
                  ? 'bg-rose-500 text-white'
                  : t.kind === 'ability'
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/90 text-slate-900'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Game over */}
      {game.phase === 'gameover' && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gradient-to-b from-[#1a1520] to-[#0a0a0e] border border-white/15 rounded-3xl p-6 max-w-sm w-full text-center space-y-3">
            <div className="text-2xl font-black">
              {game.winner === 'player' ? 'Victory!' : 'Defeat'}
            </div>
            <p className="text-sm text-white/65">{game.winReason}</p>
            <p className="text-xs text-amber-200">
              You {game.player.points} — {game.enemy.points} Enemy
            </p>
            <button
              type="button"
              onClick={() => {
                playSfx('win_sting', 0.55)
                setGame(createGame(false))
              }}
              className="w-full py-3 rounded-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950"
            >
              Play Again
            </button>
            <button
              type="button"
              onClick={onQuit}
              className="w-full py-2 rounded-2xl font-bold bg-white/10 border border-white/15"
            >
              Home
            </button>
          </div>
        </div>
      )}

      {inspectId && (
        <InspectCard card={cardById(inspectId)} onClose={() => setInspectId(null)} />
      )}
    </div>
  )
}
