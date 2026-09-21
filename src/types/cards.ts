export type Faction = 'dawn' | 'pack'
export type Stage = 'basic' | 'stage1' | 'apex'
export type Rarity = 'common' | 'rare' | 'epic' | 'apex'

export interface AttackDef {
  name: string
  energyCost: number
  damage: number
  /** Extra damage if attached energy >= 2 (Thunder Fox Surge) */
  surgeBonus?: number
  note?: string
}

export interface AbilityDef {
  name: string
  description: string
  /** onEvolve: fire when this card evolves onto a lower stage */
  trigger: 'onEvolve' | 'passive' | 'ward'
}

export interface CardDef {
  id: string
  name: string
  faction: Faction
  stage: Stage
  evoFrom?: string
  hp: number
  attacks: AttackDef[]
  ability?: AbilityDef
  rarity: Rarity
  art: string
  /** Points awarded when this Pokémon is KO'd */
  koPoints: 1 | 2
  /** Can attack the turn it is played */
  swift?: boolean
  weaknessFaction: Faction
}

export const RARITY_GEMS: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  apex: 4,
}

export const STAGE_LABEL: Record<Stage, string> = {
  basic: 'Basic',
  stage1: 'Stage 1',
  apex: 'Apex',
}
