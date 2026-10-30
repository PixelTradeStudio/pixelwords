export type LanguageCode = 'de' | 'en' | 'fr' | 'es' | 'it'
export type LetterState = 'correct' | 'present' | 'absent'

export interface LanguageDefinition {
  code: LanguageCode
  flag: string
  label: string
  nativeName: string
  keyboardLetters: string[]
}

export interface GuessResult {
  word: string
  states: LetterState[]
}

export interface LanguageStats {
  gamesPlayed: number
  gamesWon: number
  currentStreak: number
  bestStreak: number
  totalScore: number
  totalAttempts: number
  winningAttempts: number
  recentWords: string[]
}

export interface PixelWordsSave {
  version: 1
  selectedLanguage: LanguageCode
  languages: Record<LanguageCode, LanguageStats>
  score: number
  xp: number
  level: number
  settings: { music: boolean; sfx: boolean; colorblind: boolean }
  tutorialSeen: boolean
}

export const LANGUAGE_CODES: readonly LanguageCode[] = ['de', 'en', 'fr', 'es', 'it']

export const LANGUAGES: Record<LanguageCode, LanguageDefinition> = {
  de: { code: 'de', flag: '🇩🇪', label: 'Deutsch', nativeName: 'Deutsch', keyboardLetters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ'] },
  en: { code: 'en', flag: '🇬🇧', label: 'English', nativeName: 'English', keyboardLetters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] },
  fr: { code: 'fr', flag: '🇫🇷', label: 'Français', nativeName: 'Français', keyboardLetters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÇÉÈÊËÎÏÔÙÛÜŸ'] },
  es: { code: 'es', flag: '🇪🇸', label: 'Español', nativeName: 'Español', keyboardLetters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÜÑ'] },
  it: { code: 'it', flag: '🇮🇹', label: 'Italiano', nativeName: 'Italiano', keyboardLetters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÙ'] },
}

export const emptyLanguageStats = (): LanguageStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalScore: 0,
  totalAttempts: 0,
  winningAttempts: 0,
  recentWords: [],
})

export const createDefaultSave = (): PixelWordsSave => ({
  version: 1,
  selectedLanguage: 'en',
  languages: { de: emptyLanguageStats(), en: emptyLanguageStats(), fr: emptyLanguageStats(), es: emptyLanguageStats(), it: emptyLanguageStats() },
  score: 0,
  xp: 0,
  level: 1,
  settings: { music: false, sfx: true, colorblind: false },
  tutorialSeen: false,
})
