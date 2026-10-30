import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { RoundManager } from '../src/game/RoundManager.ts'

const createRound = () => new RoundManager('APPLE')
const type = (round: RoundManager, word: string) => Array.from(word).forEach((letter) => round.addLetter(letter))

describe('RoundManager', () => {
  it('evaluates an unknown five-letter guess instead of rejecting its vocabulary', () => {
    const round = createRound()
    type(round, 'APFEL')
    const submission = round.submit()
    assert.equal(submission.status, 'continue')
    assert.deepEqual(submission.result?.states, ['correct', 'correct', 'absent', 'present', 'present'])
    assert.equal(round.guesses.length, 1)
    assert.equal(round.remainingRows, 4)
  })

  it('ends a winning round immediately', () => {
    const round = createRound()
    type(round, 'APPLE')
    assert.equal(round.submit().status, 'won')
    assert.equal(round.ended, true)
    assert.equal(round.won, true)
  })

  it('ends after five guesses but allows one optional extra attempt', () => {
    const round = createRound()
    for (const word of ['PUPPY', 'LEVEL', 'ROTOR', 'CRANE', 'SLATE']) {
      type(round, word)
      round.submit()
    }
    assert.equal(round.ended, true)
    assert.equal(round.grantSecondChance(), true)
    type(round, 'APPLE')
    assert.equal(round.submit().status, 'won')
    assert.equal(round.guesses.length, 6)
  })
})
