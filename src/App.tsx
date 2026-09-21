import { useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { BattleScreen } from './screens/BattleScreen'
import { BinderScreen } from './screens/BinderScreen'

type Screen =
  | { name: 'home' }
  | { name: 'battle'; faction: 'dawn' | 'pack' }
  | { name: 'binder' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  if (screen.name === 'battle') {
    return (
      <BattleScreen
        faction={screen.faction}
        onQuit={() => setScreen({ name: 'home' })}
      />
    )
  }
  if (screen.name === 'binder') {
    return <BinderScreen onBack={() => setScreen({ name: 'home' })} />
  }
  return (
    <HomeScreen
      onPlay={(faction) => setScreen({ name: 'battle', faction })}
      onBinder={() => setScreen({ name: 'binder' })}
    />
  )
}
