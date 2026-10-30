import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES, LANGUAGE_CODES } from '../src/data/GameTypes.ts'
import { WORDS_BY_LANGUAGE } from '../src/game/WordBank.ts'
import { isFiveLetters, normalizeWord } from '../src/game/WordEvaluator.ts'

describe('bundled word lists', () => {
  for (const language of LANGUAGE_CODES) it(`has at least 300 unique five-letter ${language} words`, () => {
    const words = WORDS_BY_LANGUAGE[language]
    assert.ok(words.length >= 300, `received ${words.length}`)
    assert.equal(new Set(words).size, words.length)
    assert.equal(words.every(isFiveLetters), true)
    assert.equal(words.every((word) => word === normalizeWord(word)), true)
    assert.ok(LANGUAGES[language].keyboardLetters.length > 25)
  })
})
