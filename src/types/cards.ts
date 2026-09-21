export type Faction = 'dawn' | 'pack' | 'neutral'
export type CardType = 'beast' | 'relic' | 'storm' | 'binder'
export type Rarity = 'common' | 'rare' | 'epic' | 'apex'
export type Keyword =
  | 'surge'
  | 'ward'
  | 'hunt'
  | 'bond'
  | 'apex'
  | 'swift'
  | 'flight'
  | 'guard'

export interface CardDef {
  id: number
  name: string
  faction: Faction
  type: CardType
  rarity: Rarity
  cost: number
  atk?: number
  def?: number
  hp?: number
  keywords: Keyword[]
  ability: string
  tags: string[]
  tutorial?: boolean
  constructed?: boolean
}

export const RARITY_COPIES: Record<Rarity, number> = {
  common: 2,
  rare: 2,
  epic: 2,
  apex: 1,
}

export const KEYWORD_HELP: Record<Keyword, string> = {
  surge: 'Deals +1 damage on the first hit each Hunt.',
  ward: 'Negates the next damage instance taken.',
  hunt: 'Can mark a target; Hunt-marked beasts take Surge damage first.',
  bond: 'Triggers when played next to a friendly beast.',
  apex: 'Powerful once-per-battle effect when this beast enters play.',
  swift: 'May attack the turn it is played.',
  flight: 'Can only be blocked by Flight or Hunt beasts.',
  guard: 'Must be blocked before other friendly beasts.',
}
