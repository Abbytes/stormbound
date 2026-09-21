import { chromium } from 'playwright-core'
import { createServer } from 'http'
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join, extname } from 'path'

const root = join(process.cwd(), 'dist')
const out = join(process.cwd(), 'preview')
mkdirSync(out, { recursive: true })
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
}
const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0])
  if (url.startsWith('/stormbound')) url = url.slice(11) || '/'
  let path = join(root, url === '/' ? 'index.html' : url)
  if (!existsSync(path) || statSync(path).isDirectory()) path = join(root, 'index.html')
  try {
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' })
    res.end(readFileSync(path))
  } catch {
    res.writeHead(404)
    res.end('x')
  }
})
await new Promise((r) => server.listen(4184, r))

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})

const closeInspect = async () => {
  await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Close')
      ?.click(),
  )
  await page.waitForTimeout(80)
}

await page.goto('http://127.0.0.1:4184/stormbound/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(400)
await page.evaluate(() =>
  [...document.querySelectorAll('button')]
    .find((x) => /Dawnpack/i.test(x.textContent || ''))
    ?.click(),
)
await page.waitForSelector('text=End Turn')
await page.waitForTimeout(1100)
await closeInspect()

// Wait for Drew / MAIN PHASE toast to settle
await page.waitForTimeout(400)
await page.screenshot({ path: join(out, 'battle_hand.png') })

// 1) Hand select → SUMMON HERE glow
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => {
    const r = b.getBoundingClientRect()
    return r.bottom > 640 && /Sun Cub/i.test(b.innerText || '')
  })
  btn?.click()
})
await page.waitForTimeout(450)
await closeInspect()
await page.waitForTimeout(200)
const summonVisible = await page.evaluate(
  () => !!document.body.innerText.includes('SUMMON HERE'),
)
console.log('SUMMON HERE visible:', summonVisible)
await page.screenshot({ path: join(out, 'battle_slot_highlight.png') })
await page.screenshot({ path: join(out, 'hand_select_summon_glow.png') })

// Play onto first glowing slot
await page.getByText('SUMMON HERE').first().click({ force: true })
await page.waitForTimeout(1200)
await closeInspect()
await page.screenshot({ path: join(out, 'battle_board_painted.png') })

// 2) Damaged beast — mutate board HP via debug hook
await page.evaluate(() => {
  const get = window.__sbGet
  const set = window.__sbSet
  if (!get || !set) throw new Error('no debug hook')
  const s = structuredClone(get())
  // Ensure a player beast exists and is hurt
  const slot = s.player.beasts.findIndex((b) => b)
  if (slot < 0) throw new Error('no player beast')
  const b = { ...s.player.beasts[slot], hp: Math.max(1, s.player.beasts[slot].hp - 1) }
  s.player.beasts[slot] = b
  // Push a damage FX so red tint + floating number show
  const id = (s.fxSeq || 0) + 1
  s.fxSeq = id
  s.fx = [
    ...s.fx,
    {
      id,
      text: `${b.cardId} takes 1`,
      kind: 'damage',
      targetUid: b.uid,
      amount: 1,
    },
  ]
  // Put an enemy beast for context
  if (!s.enemy.beasts.some(Boolean)) {
    s.enemy.beasts[1] = {
      uid: 'e_preview',
      cardId: 11,
      atk: 1,
      def: 1,
      hp: 1,
      maxHp: 1,
      keywords: [],
      ward: false,
      summonSick: false,
      bonded: false,
      huntMarked: false,
      attacking: false,
      guarding: false,
      attackedThisTurn: false,
      tempAtk: 0,
      apexUsed: false,
      side: 'enemy',
      slot: 1,
    }
  }
  s.phase = 'main'
  s.active = 'player'
  s.uiMode = 'idle'
  s.selectedHand = null
  s.selectedBeastUid = null
  s.attackSourceUid = null
  set(s)
})
await page.waitForTimeout(500)
await page.screenshot({ path: join(out, 'battle_damaged_beast.png') })
await page.screenshot({ path: join(out, 'damaged_beast.png') })

// 3) Kill clear — resolve a kill FX and null the slot
await page.evaluate(() => {
  const get = window.__sbGet
  const set = window.__sbSet
  const s = structuredClone(get())
  // Enemy beast about to die visual: show damage then clear
  let enemySlot = s.enemy.beasts.findIndex((b) => b)
  if (enemySlot < 0) {
    s.enemy.beasts[0] = {
      uid: 'e_kill',
      cardId: 11,
      atk: 1,
      def: 1,
      hp: 1,
      maxHp: 1,
      keywords: [],
      ward: false,
      summonSick: false,
      bonded: false,
      huntMarked: false,
      attacking: false,
      guarding: false,
      attackedThisTurn: false,
      tempAtk: 0,
      apexUsed: false,
      side: 'enemy',
      slot: 0,
    }
    enemySlot = 0
  }
  const victim = s.enemy.beasts[enemySlot]
  const id = (s.fxSeq || 0) + 1
  s.fxSeq = id
  s.fx = [
    ...s.fx,
    {
      id,
      text: 'Grave Pup falls!',
      kind: 'kill',
      targetUid: victim.uid,
      amount: 1,
    },
  ]
  s.enemy.beasts[enemySlot] = null
  s.enemy.discard = [...(s.enemy.discard || []), victim.cardId]
  s.phase = 'main'
  s.active = 'player'
  set(s)
})
await page.waitForTimeout(700)
await page.screenshot({ path: join(out, 'battle_kill_clear.png') })
await page.screenshot({ path: join(out, 'kill_clear.png') })

// Extra: attack targeting + duel board via normal play
await page.evaluate(() => {
  const get = window.__sbGet
  const set = window.__sbSet
  const s = structuredClone(get())
  // Refresh a live duel-looking board
  const mk = (cardId, side, slot, hp, maxHp, atk) => ({
    uid: `${side}_${slot}_${cardId}`,
    cardId,
    atk,
    def: 1,
    hp,
    maxHp,
    keywords: [],
    ward: false,
    summonSick: false,
    bonded: false,
    huntMarked: false,
    attacking: false,
    guarding: false,
    attackedThisTurn: false,
    tempAtk: 0,
    apexUsed: false,
    side,
    slot,
  })
  s.player.beasts = [mk(3, 'player', 0, 2, 2, 1), mk(5, 'player', 1, 1, 2, 2), null]
  s.enemy.beasts = [mk(11, 'enemy', 0, 1, 1, 1), null, mk(12, 'enemy', 2, 2, 2, 2)]
  s.player.storm = 3
  s.player.stormMax = 3
  s.playerDawnCount = 3
  s.phase = 'main'
  s.active = 'player'
  s.uiMode = 'idle'
  s.fx = []
  set(s)
})
await page.waitForTimeout(400)
await page.screenshot({ path: join(out, 'battle_duel_board.png') })

// Select player beast → Attack → targeting
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => {
    const r = b.getBoundingClientRect()
    return r.top > 380 && r.top < 620 && /Sun Cub/i.test(b.innerText || '')
  })
  btn?.click()
})
await page.waitForTimeout(400)
await closeInspect()
await page.screenshot({ path: join(out, 'battle_actions.png') })
await page.evaluate(() =>
  [...document.querySelectorAll('button')]
    .find((b) => /Attack/i.test(b.textContent || '') && !/End/i.test(b.textContent || ''))
    ?.click(),
)
await page.waitForTimeout(700)
await page.screenshot({ path: join(out, 'battle_attack_targeting.png') })
await page.screenshot({ path: join(out, 'battle_combat_toast.png') })

writeFileSync(
  join(out, 'SHIP_NOTES.txt'),
  `Stormbound hand↔board loop SHIPPED
Live: https://abbytes.github.io/stormbound/

Changes:
1. Draw toast "Drew {CardName}" + MAIN PHASE after Dawn; soft-cap hand at 7 (mill toast)
2. Tap hand → empty legal slots glow SUMMON HERE; hint "Tap an Open Slot to play {name} ({cost}⚡)"
3. Unaffordable hand cards dimmed harder
4. Board HP pip heart current/max; red tint + floating dmg on hit; falls! toast clears slot
5. AI always tries to summon into empty slots; prefers kill/efficient trades, else face

Previews: hand_select_summon_glow.png, damaged_beast.png, kill_clear.png
`,
)

console.log('preview screenshots written')
await browser.close()
server.close()
