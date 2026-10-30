const ATTEMPT_BONUS = [400, 250, 150, 75, 25]

export class ScoreManager {
  public pointsForWin(attemptsUsed: number, currentStreak: number): number {
    const bonus = ATTEMPT_BONUS[Math.min(ATTEMPT_BONUS.length - 1, Math.max(0, attemptsUsed - 1))]
    return 100 + bonus + Math.max(0, currentStreak) * 10
  }

  public xpForWin(points: number): number {
    return Math.max(50, Math.round(points * 0.6))
  }

  public levelForXp(xp: number): number {
    let level = 1
    let remaining = Math.max(0, xp)
    while (remaining >= level * 300) {
      remaining -= level * 300
      level++
    }
    return level
  }

  public xpIntoLevel(xp: number): { current: number; required: number } {
    let level = 1
    let remaining = Math.max(0, xp)
    while (remaining >= level * 300) {
      remaining -= level * 300
      level++
    }
    return { current: remaining, required: level * 300 }
  }
}
