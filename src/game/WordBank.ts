import { wordsDe } from '../data/words-de.ts'
import { wordsEn } from '../data/words-en.ts'
import { wordsEs } from '../data/words-es.ts'
import { wordsFr } from '../data/words-fr.ts'
import { wordsIt } from '../data/words-it.ts'
import type { LanguageCode } from '../data/GameTypes.ts'
import { isFiveLetters, normalizeWord } from './WordEvaluator.ts'

export const WORDS_BY_LANGUAGE: Record<LanguageCode, readonly string[]> = {
  de: wordsDe,
  en: wordsEn,
  fr: wordsFr,
  es: wordsEs,
  it: wordsIt,
}

export class WordBank {
  private readonly words: readonly string[]
  private readonly wordSet: Set<string>

  constructor(language: LanguageCode) {
    this.words = WORDS_BY_LANGUAGE[language]
    this.wordSet = new Set(this.words)
  }

  public isValidGuess(word: string): boolean {
    const normalized = normalizeWord(word)
    return isFiveLetters(normalized) && this.wordSet.has(normalized)
  }

  public pickTarget(recentWords: readonly string[] = [], random: () => number = Math.random): string {
    const recent = new Set(recentWords.map(normalizeWord))
    const pool = this.words.filter((word) => !recent.has(word))
    const choices = pool.length ? pool : this.words
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]
  }

  public get size(): number {
    return this.words.length
  }
}
