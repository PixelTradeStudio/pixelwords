import type { LanguageCode, LanguageStats } from '../data/GameTypes.ts'

export class StatsManager {
  public recordStart(stats: LanguageStats): void {
    stats.gamesPlayed++
  }

  public recordWin(stats: LanguageStats, attempts: number, points: number): void {
    stats.gamesWon++
    stats.totalAttempts += attempts
    stats.winningAttempts += attempts
    stats.totalScore += points
  }

  public recordLoss(stats: LanguageStats, attempts: number): void {
    stats.totalAttempts += attempts
  }

  public winRate(stats: LanguageStats): number {
    return stats.gamesPlayed ? Math.round(stats.gamesWon / stats.gamesPlayed * 100) : 0
  }

  public averageAttempts(stats: LanguageStats): string {
    return stats.gamesWon ? (stats.winningAttempts / stats.gamesWon).toFixed(1) : '—'
  }

  public bestLanguage(languages: Record<LanguageCode, LanguageStats>): LanguageCode | null {
    const best = Object.entries(languages).sort((a, b) => b[1].bestStreak - a[1].bestStreak)[0]
    return best && best[1].gamesPlayed > 0 ? best[0] as LanguageCode : null
  }
}
