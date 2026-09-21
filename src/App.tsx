import { useState, type ReactNode } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { BattleScreen } from './screens/BattleScreen'
import { CardsScreen } from './screens/CardsScreen'
import { BottomNav, type NavTab } from './components/BottomNav'

type Screen = 'home' | 'battle' | 'cards'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  const goTab = (tab: NavTab) => setScreen(tab)

  let body: ReactNode
  if (screen === 'battle') {
    body = <BattleScreen onQuit={() => setScreen('home')} />
  } else if (screen === 'cards') {
    body = <CardsScreen />
  } else {
    body = (
      <HomeScreen
        onPlay={() => setScreen('battle')}
        onCards={() => setScreen('cards')}
      />
    )
  }

  return (
    <div className="h-dvh max-w-lg mx-auto flex flex-col bg-[#0a0a0c] text-white overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{body}</div>
      {screen !== 'battle' && (
        <BottomNav active={screen} onChange={goTab} />
      )}
      {screen === 'battle' && (
        <BottomNav active="battle" onChange={goTab} />
      )}
    </div>
  )
}
