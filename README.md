# Stormbound

Mobile-first web TCG — **Dawnpack** vs **Pack of the Dead**. Client-only React + Vite + TypeScript + Tailwind MVP.

Standalone app at `/workspace/stormbound`. Does **not** touch ab-creative-world or abbytes sites.

## Quick start

```bash
cd /workspace/stormbound
npm install
npm run dev
```

Open the local URL (usually `http://localhost:5173`) on a phone or narrow browser window.

### Production build

```bash
npm run build
npm run preview
```

`preview` serves the `dist/` folder. You can also static-serve `dist/` with any HTTP server.

## What’s in the MVP

- **Home** — title, Play Tutorial (Dawn or Pack), Binder
- **Battle** — 5-slot Ashfall-style floor, Storm economy, draw/main/hunt/dusk loop, simple AI opponent, win by Binder HP 0 or 3 Storm Charges
- **Binder** — page-turn book UI (Dawnpack pp.1–2, Pack pp.3–4, Relics & Storm), tap → inspect overlay (Cost · ATK/DEF/HP · ability · rarity · tags)
- **Card pool** — 20-card tutorial decks + 40-card constructed data (IDs 1–40)
- **SFX** — page turn, inspect, Bond, Surge, Apex, Dawn horn (stubs in `public/audio/`)

## Factions & keywords

- Dawnpack (cyan) · Pack of the Dead (violet)
- Keywords: Surge, Ward, Hunt, Bond, Apex, Swift, Flight, Guard

## Project layout

```
src/data/cards.ts     — all card defs + decks + binder pages
src/game/engine.ts    — turn loop + AI
src/game/audio.ts     — SFX helpers
src/screens/          — Home, Battle, Binder
src/components/       — CardFace, BoardSlot, InspectOverlay
public/audio/         — wav stubs from stormbound-sfx
```

## Known gaps

- Placeholder gradient art (no illustrated portraits yet)
- AI is greedy/simple; blockers are auto-assigned
- Constructed deck builder not in MVP (pool is in data for later)
- Some relic/apex edge cases simplified for demo stability
- Autoplay may mute SFX until first user tap
