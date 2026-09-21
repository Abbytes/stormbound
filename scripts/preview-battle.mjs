import { chromium } from 'playwright-core'
import { createServer } from 'http'
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, extname } from 'path'
const root = join(process.cwd(), 'dist'); const out = join(process.cwd(), 'preview'); mkdirSync(out,{recursive:true})
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'}
const server=createServer((req,res)=>{let url=decodeURIComponent(req.url.split('?')[0]); if(url.startsWith('/stormbound')) url=url.slice(11)||'/'; let path=join(root,url==='/'?'index.html':url); if(!existsSync(path)||statSync(path).isDirectory()) path=join(root,'index.html'); try{res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(readFileSync(path))}catch{res.writeHead(404);res.end('x')}})
await new Promise(r=>server.listen(4184,r))
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']})
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2})
const close=async()=>{await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Close')?.click()); await page.waitForTimeout(100)}

await page.goto('http://127.0.0.1:4184/stormbound/',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(300)
await page.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/Dawnpack/i.test(x.textContent||''))?.click())
await page.waitForSelector('text=End Turn'); await page.waitForTimeout(900); await close()
await page.screenshot({path:join(out,'battle_hand.png')})

await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getBoundingClientRect().bottom>640&&/Sun Cub/i.test(b.innerText||''))?.click())
await page.waitForTimeout(350); await close()
await page.screenshot({path:join(out,'battle_slot_highlight.png')})
await page.getByText('Play Here').first().click({force:true})
await page.waitForTimeout(1300); await close()
await page.screenshot({path:join(out,'battle_board_painted.png')})

await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>{const r=b.getBoundingClientRect(); return r.top<600&&r.bottom<650&&/Sun Cub/i.test(b.innerText||'')})?.click())
await page.waitForTimeout(500); await close(); await page.waitForTimeout(200)
await page.screenshot({path:join(out,'battle_actions.png')})

await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Attack/i.test(b.textContent||'')&&!/End/i.test(b.textContent||''))?.click())
await page.waitForTimeout(900)
await page.screenshot({path:join(out,'battle_attack_targeting.png')})
const struck=await page.evaluate(()=>{
  const tip=[...document.querySelectorAll('button')].find(b=>/TAP TO STRIKE|Lord Bone/i.test(b.innerText||''))
  tip?.click(); return !!tip
})
console.log('struck face', struck)
await page.waitForTimeout(1300)
await page.screenshot({path:join(out,'battle_combat_toast.png')})

for(let i=0;i<5;i++){
  await close()
  const et=page.locator('button',{hasText:/End Turn|Cancel/})
  if(!(await et.count())) break
  await et.first().click({force:true})
  await page.waitForTimeout(2200)
}
await page.waitForTimeout(800)
await page.screenshot({path:join(out,'battle_duel_board.png')})
const board=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.top>300&&r.top<560&&r.height>100}).map(b=>b.innerText.slice(0,30)))
console.log('board cards', board)
await browser.close(); server.close()
