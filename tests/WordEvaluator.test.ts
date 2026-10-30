import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGuess, isFiveLetters, normalizeWord } from '../src/game/WordEvaluator.ts'

describe('evaluateGuess', () => {
  it('marks exact matches before consuming duplicate letter counts', () => {
    assert.deepEqual(evaluateGuess('APPLE', 'PUPPY'), ['present', 'absent', 'correct', 'absent', 'absent'])
  })

  it('does not award more duplicate letters than the target contains', () => {
    assert.deepEqual(evaluateGuess('LEVEL', 'LEEEE'), ['correct', 'correct', 'absent', 'correct', 'absent'])
  })

  it('uses each target occurrence only once for partial matches', () => {
    assert.deepEqual(evaluateGuess('ROTOR', 'ERROR'), ['absent', 'present', 'absent', 'correct', 'correct'])
  })

  it('normalizes accented letters without stripping them', () => {
    assert.equal(normalizeWord('école'), 'ÉCOLE')
    assert.equal(isFiveLetters('école'), true)
    assert.equal(isFiveLetters('straße'), false)
  })

  it('rejects inputs that are not five Unicode letters', () => {
    assert.equal(isFiveLetters('CHAT'), false)
    assert.equal(isFiveLetters('🙂🙂🙂🙂🙂'), false)
    assert.throws(() => evaluateGuess('FOUR', 'APPLE'), RangeError)
  })
})
