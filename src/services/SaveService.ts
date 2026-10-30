import { createDefaultSave, emptyLanguageStats, LANGUAGE_CODES, type LanguageCode, type LanguageStats, type PixelWordsSave } from '../data/GameTypes.ts'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const SAVE_KEY = 'pixelwords-save-v1'

const cleanStats = (candidate: unknown): LanguageStats => {
  const defaults = emptyLanguageStats()
  if (!candidate || typeof candidate !== 'object') return defaults
  const value = candidate as Partial<LanguageStats>
  const number = (input: unknown, fallback: number) => Number.isFinite(Number(input)) ? Math.max(0, Number(input)) : fallback
  return {
    gamesPlayed: number(value.gamesPlayed, 0),
    gamesWon: number(value.gamesWon, 0),
    currentStreak: number(value.currentStreak, 0),
    bestStreak: number(value.bestStreak, 0),
    totalScore: number(value.totalScore, 0),
    totalAttempts: number(value.totalAttempts, 0),
    winningAttempts: number(value.winningAttempts, 0),
    recentWords: Array.isArray(value.recentWords) ? value.recentWords.filter((word): word is string => typeof word === 'string').slice(-50) : [],
  }
}

export class SaveService {
  private readonly storage: StorageLike
  private readonly key: string

  constructor(storage: StorageLike, key = SAVE_KEY) {
    this.storage = storage
    this.key = key
  }

  public load(): PixelWordsSave {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return createDefaultSave()
      const value = JSON.parse(raw) as Partial<PixelWordsSave>
      if (value.version !== 1) return createDefaultSave()
      const save = createDefaultSave()
      save.selectedLanguage = LANGUAGE_CODES.includes(value.selectedLanguage as LanguageCode) ? value.selectedLanguage as LanguageCode : 'en'
      const savedLanguages = (value.languages && typeof value.languages === 'object'
        ? value.languages
        : {}) as Partial<Record<LanguageCode, unknown>>
      for (const language of LANGUAGE_CODES) save.languages[language] = cleanStats(savedLanguages[language])
      save.score = Number.isFinite(value.score) ? Math.max(0, Number(value.score)) : 0
      save.xp = Number.isFinite(value.xp) ? Math.max(0, Number(value.xp)) : 0
      save.level = Number.isFinite(value.level) ? Math.max(1, Number(value.level)) : 1
      if (value.settings && typeof value.settings === 'object') {
        save.settings.music = Boolean(value.settings.music)
        save.settings.sfx = value.settings.sfx !== false
        save.settings.colorblind = Boolean(value.settings.colorblind)
      }
      save.tutorialSeen = Boolean(value.tutorialSeen)
      return save
    } catch {
      return createDefaultSave()
    }
  }

  public save(state: PixelWordsSave): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(state))
    } catch {
      // Private browsing or quota limits leave this session playable without persistence.
    }
  }
}
