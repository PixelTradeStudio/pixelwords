import type { LanguageStats } from '../data/GameTypes.ts'

export class StreakManager {
  public win(stats: LanguageStats): { streak: number; record: boolean } {
    stats.currentStreak++
    const record = stats.currentStreak > stats.bestStreak
    if (record) stats.bestStreak = stats.currentStreak
    return { streak: stats.currentStreak, record }
  }

  public lose(stats: LanguageStats): void {
    stats.currentStreak = 0
  }

  public rankForBest(bestStreak: number): string {
    if (bestStreak >= 30) return 'MASTER'
    if (bestStreak >= 20) return 'DIAMOND'
    if (bestStreak >= 12) return 'PLATINUM'
    if (bestStreak >= 7) return 'GOLD'
    if (bestStreak >= 3) return 'SILVER'
    return 'BRONZE'
  }
}
