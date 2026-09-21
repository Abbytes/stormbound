import { useState, type ReactNode } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { BattleScreen } from './screens/BattleScreen'
import { BinderScreen } from './screens/BinderScreen'
import { StubScreen } from './screens/StubScreen'
import { BottomNav, type NavTab } from './components/BottomNav'

type Screen =
  | { name: 'home' }
  | { name: 'battle'; faction: 'dawn' | 'pack' }
  | { name: 'binder' }
  | { name: 'deck' }
  | { name: 'shop' }

function tabFor(screen: Screen): NavTab {
  if (screen.name === 'battle') return 'battle'
  if (screen.name === 'binder') return 'cards'
  if (screen.name === 'deck') return 'deck'
  if (screen.name === 'shop') return 'shop'
  return 'home'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [lastFaction, setLastFaction] = useState<'dawn' | 'pack'>('dawn')

  const goTab = (tab: NavTab) => {
    if (tab === 'home') setScreen({ name: 'home' })
    else if (tab === 'battle') setScreen({ name: 'battle', faction: lastFaction })
    else if (tab === 'cards') setScreen({ name: 'binder' })
    else if (tab === 'deck') setScreen({ name: 'deck' })
    else if (tab === 'shop') setScreen({ name: 'shop' })
  }

  let body: ReactNode
  if (screen.name === 'battle') {
    body = (
      <BattleScreen
        faction={screen.faction}
        onQuit={() => setScreen({ name: 'home' })}
      />
    )
  } else if (screen.name === 'binder') {
    body = <BinderScreen onBack={() => setScreen({ name: 'home' })} />
  } else if (screen.name === 'deck') {
    body = (
      <StubScreen
        title="Deck Builder"
        blurb="Craft Dawnpack and Pack of the Dead lists from the 40-card pool. Stub for now — binder holds the collection."
      />
    )
  } else if (screen.name === 'shop') {
    body = (
      <StubScreen
        title="Storm Shop"
        blurb="Packs, cosmetics, and Apex seals will land here. For now, battle and binder are live."
      />
    )
  } else {
    body = (
      <HomeScreen
        onPlay={(faction) => {
          setLastFaction(faction)
          setScreen({ name: 'battle', faction })
        }}
        onBinder={() => setScreen({ name: 'binder' })}
      />
    )
  }

  return (
    <div className="h-dvh max-w-lg mx-auto flex flex-col bg-[#0a0a0c] text-white overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{body}</div>
      <BottomNav active={tabFor(screen)} onChange={goTab} />
    </div>
  )
}
