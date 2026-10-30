import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ScoreManager } from '../src/game/ScoreManager.ts'
import { StreakManager } from '../src/game/StreakManager.ts'
import { emptyLanguageStats } from '../src/data/GameTypes.ts'

describe('score and streak progression', () => {
  it('rewards fast solves without a complicated score formula', () => {
    const scores = [1, 2, 3, 4, 5].map((attempts) => new ScoreManager().pointsForWin(attempts, 0))
    assert.deepEqual(scores, [500, 350, 250, 175, 125])
  })

  it('tracks a per-language streak and preserves the best on loss', () => {
    const stats = emptyLanguageStats()
    const streak = new StreakManager()
    assert.deepEqual(streak.win(stats), { streak: 1, record: true })
    assert.deepEqual(streak.win(stats), { streak: 2, record: true })
    streak.lose(stats)
    assert.equal(stats.currentStreak, 0)
    assert.equal(stats.bestStreak, 2)
  })
})
