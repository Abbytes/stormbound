# Stormbound

Mobile-first web TCG — **Dawnpack** vs **Pack of the Dead**. Client-only React + Vite + TypeScript + Tailwind.

Live: **https://abbytes.github.io/stormbound/**

Standalone app at `/workspace/stormbound`. Does **not** touch ab-creative-world or other sites.

## Quick start

```bash
cd /workspace/stormbound
npm install
npm run dev
```

### Production build

```bash
npm run build   # base: /stormbound/
npm run preview
```

Deploy: copy `dist/` (+ `.nojekyll`) to the `gh-pages` branch and force-push.

## UI shell

Premium portrait TCG layout:

- Enemy / player binder headers with gradient HP bars
- 3-lane battlefield (Enemy Slot / Open Slot dashed outlines)
- Tall cards: name · cost gem · art · ability · ATK / Guard / rarity / HP
- APEX rarity thick gold glow border
- Selected-card action row (Attack / Guard / Apex)
- Vertical **End Turn** on the right edge
- Fanned hand, Storm ⚡ + Apex 🔥 resources
- Bottom nav: Home · Battle · Cards · Deck · Shop

## Engine

- Turn loop: Dawn → Draw → Main → Hunt → Dusk
- Win: binder HP 0 or 3 Storm Charges (Apex power)
- Tutorial decks + 40-card constructed pool (IDs 1–40)
- Page-turn binder under **Cards**
- SFX in `public/audio/` (paths honor Vite `base`)

## Preview shots

See `preview/battle_empty.png` and `preview/battle_action_row.png`.
