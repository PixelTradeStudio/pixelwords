import type { LetterState } from '../data/GameTypes.ts'

export const normalizeWord = (word: string): string => word.normalize('NFC').toLocaleUpperCase()
export const wordLetters = (word: string): string[] => Array.from(normalizeWord(word))
export const isFiveLetters = (word: string): boolean => {
  const letters = wordLetters(word)
  return letters.length === 5 && letters.every((letter) => /^\p{L}$/u.test(letter))
}

export const evaluateGuess = (targetInput: string, guessInput: string): LetterState[] => {
  const target = wordLetters(targetInput)
  const guess = wordLetters(guessInput)
  if (target.length !== 5 || guess.length !== 5) throw new RangeError('Target and guess must each contain five letters')

  const states: LetterState[] = Array(5).fill('absent')
  const remaining = new Map<string, number>()
  for (let index = 0; index < 5; index++) {
    if (guess[index] === target[index]) {
      states[index] = 'correct'
    } else {
      remaining.set(target[index], (remaining.get(target[index]) ?? 0) + 1)
    }
  }
  for (let index = 0; index < 5; index++) {
    if (states[index] === 'correct') continue
    const count = remaining.get(guess[index]) ?? 0
    if (count > 0) {
      states[index] = 'present'
      remaining.set(guess[index], count - 1)
    }
  }
  return states
}
