import type { GuessResult } from '../data/GameTypes.ts'
import { evaluateGuess, isFiveLetters, normalizeWord } from './WordEvaluator.ts'

export type GuessStatus = 'invalid' | 'continue' | 'won' | 'lost'

export interface GuessSubmission {
  status: GuessStatus
  result?: GuessResult
}

export class RoundManager {
  public readonly target: string
  public readonly maxAttempts = 5
  public readonly guesses: GuessResult[] = []
  public currentInput = ''
  public allowedAttempts = 5
  public ended = false
  public won = false

  constructor(target: string) {
    this.target = target
  }

  public addLetter(letter: string): void {
    if (this.ended || this.currentInput.length >= 5) return
    const normalized = normalizeWord(letter)
    if (Array.from(normalized).length !== 1 || !/^\p{L}$/u.test(normalized)) return
    this.currentInput += normalized
  }

  public deleteLetter(): void {
    if (!this.ended) this.currentInput = Array.from(this.currentInput).slice(0, -1).join('')
  }

  public submit(): GuessSubmission {
    if (this.ended || !isFiveLetters(this.currentInput)) return { status: 'invalid' }
    const word = normalizeWord(this.currentInput)

    const result = { word, states: evaluateGuess(this.target, word) }
    this.guesses.push(result)
    this.currentInput = ''
    this.won = result.states.every((state) => state === 'correct')
    this.ended = this.won || this.guesses.length >= this.allowedAttempts
    return { status: this.won ? 'won' : this.ended ? 'lost' : 'continue', result }
  }

  public grantSecondChance(): boolean {
    if (!this.ended || this.won || this.allowedAttempts > this.maxAttempts) return false
    this.allowedAttempts++
    this.ended = false
    return true
  }

  public get remainingRows(): number {
    return Math.max(0, this.allowedAttempts - this.guesses.length)
  }
}
