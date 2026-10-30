import { LANGUAGES, LANGUAGE_CODES, type LanguageCode, type LetterState, type PixelWordsSave } from '../data/GameTypes.ts'
import { RoundManager } from '../game/RoundManager.ts'
import { ScoreManager } from '../game/ScoreManager.ts'
import { StatsManager } from '../game/StatsManager.ts'
import { StreakManager } from '../game/StreakManager.ts'
import { WordBank } from '../game/WordBank.ts'
import { AudioService } from '../services/AudioService.ts'
import { MockAdService } from '../services/MockAdService.ts'
import { SaveService } from '../services/SaveService.ts'

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const WORD_HISTORY_LIMIT = 50
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] ?? char))

export class GameApp {
  private readonly saveService = new SaveService(window.localStorage)
  private readonly scoreManager = new ScoreManager()
  private readonly statsManager = new StatsManager()
  private readonly streakManager = new StreakManager()
  private readonly adService = new MockAdService()
  private readonly audio = new AudioService()
  private state: PixelWordsSave
  private screen: 'title' | 'language' | 'game' | 'result' | 'stats' | 'settings' = 'title'
  private round: RoundManager | null = null
  private bank: WordBank | null = null
  private lastResult: 'win' | 'loss' | null = null
  private attemptsUsed = 0
  private pendingReveal = false
  private invalidRow = false
  private toastTimer = 0
  private revealTimer = 0
  private streakBeforeLoss = 0
  private isNewRecord = false
  private roundStartedAt = 0
  private elapsedSeconds = 0
  private roundScore = 0
  private isDisposed = false

  constructor(private readonly root: HTMLDivElement) {
    this.state = this.saveService.load()
    this.audio.setMusic(this.state.settings.music)
    this.audio.setSfx(this.state.settings.sfx)
  }

  public start(): void {
    this.root.addEventListener('click', this.onClick)
    window.addEventListener('keydown', this.onKeyDown)
    this.render()
  }

  public dispose(): void {
    this.isDisposed = true
    this.root.removeEventListener('click', this.onClick)
    window.removeEventListener('keydown', this.onKeyDown)
    window.clearTimeout(this.toastTimer)
    window.clearTimeout(this.revealTimer)
    this.audio.dispose()
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const actionElement = target.closest<HTMLElement>('[data-action]')
    if (actionElement) {
      const action = actionElement.dataset.action
      const language = actionElement.dataset.language as LanguageCode | undefined
      if (language && LANGUAGE_CODES.includes(language)) this.chooseLanguage(language)
      else this.handleAction(action ?? '')
      return
    }
    const languageElement = target.closest<HTMLElement>('[data-language]')
    const language = languageElement?.dataset.language as LanguageCode | undefined
    if (language && LANGUAGE_CODES.includes(language)) {
      this.chooseLanguage(language)
      return
    }
    const keyElement = target.closest<HTMLElement>('[data-key]')
    if (keyElement) this.handleKey(keyElement.dataset.key ?? '')
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.screen !== 'game' || this.pendingReveal || !this.round || this.round.ended) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Enter') {
      event.preventDefault()
      this.submitGuess()
      return
    }
    if (event.key === 'Backspace') {
      event.preventDefault()
      this.round.deleteLetter()
      this.audio.play('delete')
      this.render()
      return
    }
    if (Array.from(event.key).length === 1 && /^\p{L}$/u.test(event.key)) {
      const normalized = event.key.normalize('NFC').toLocaleUpperCase()
      if (LANGUAGES[this.state.selectedLanguage].keyboardLetters.includes(normalized)) {
        event.preventDefault()
        this.round.addLetter(normalized)
        this.audio.play('key')
        this.render()
      }
    }
  }

  private handleAction(action: string): void {
    switch (action) {
      case 'play': this.screen = 'language'; this.render(); break
      case 'language': this.screen = 'language'; this.render(); break
      case 'stats': this.screen = 'stats'; this.render(); break
      case 'settings': this.screen = 'settings'; this.render(); break
      case 'back': this.screen = 'title'; this.render(); break
      case 'next':
        this.startRound()
        break
      case 'menu':
        this.screen = 'title'
        this.render()
        break
      case 'second-chance': this.claimSecondChance(); break
      case 'music':
        this.state.settings.music = !this.state.settings.music
        this.audio.setMusic(this.state.settings.music)
        this.persist()
        this.render()
        break
      case 'sfx':
        this.state.settings.sfx = !this.state.settings.sfx
        this.audio.setSfx(this.state.settings.sfx)
        this.persist()
        this.render()
        break
      case 'colorblind':
        this.state.settings.colorblind = !this.state.settings.colorblind
        this.persist()
        this.render()
        break
      case 'enter': this.submitGuess(); break
      case 'backspace':
        this.round?.deleteLetter()
        this.audio.play('delete')
        this.render()
        break
    }
  }

  private handleKey(key: string): void {
    if (key === 'ENTER') {
      this.submitGuess()
      return
    }
    if (key === 'BACKSPACE') {
      this.round?.deleteLetter()
      this.audio.play('delete')
      this.render()
      return
    }
    if (this.screen !== 'game' || this.pendingReveal || !this.round || this.round.ended) return
    this.round.addLetter(key)
    this.audio.play('key')
    this.render()
  }

  private chooseLanguage(language: LanguageCode): void {
    this.state.selectedLanguage = language
    this.persist()
    this.startRound()
  }

  private startRound(): void {
    window.clearTimeout(this.revealTimer)
    const language = this.state.selectedLanguage
    this.bank = new WordBank(language)
    const stats = this.state.languages[language]
    const target = this.bank.pickTarget(stats.recentWords)
    stats.recentWords = [...stats.recentWords.filter((word) => word !== target), target].slice(-WORD_HISTORY_LIMIT)
    this.round = new RoundManager(target)
    this.statsManager.recordStart(stats)
    this.adService.resetRound()
    this.pendingReveal = false
    this.invalidRow = false
    this.lastResult = null
    this.isNewRecord = false
    this.attemptsUsed = 0
    this.roundScore = 0
    this.roundStartedAt = Date.now()
    this.screen = 'game'
    this.persist()
    this.render()
  }

  private submitGuess(): void {
    if (this.screen !== 'game' || !this.round || this.pendingReveal || this.round.ended) return
    if (this.round.currentInput.length !== 5) {
      this.rejectGuess('ENTER FIVE LETTERS')
      return
    }
    const submission = this.round.submit()
    if (submission.status === 'invalid' || !submission.result) {
      this.rejectGuess('ENTER FIVE LETTERS')
      return
    }
    this.pendingReveal = true
    this.attemptsUsed = this.round.guesses.length
    this.audio.play('submit')
    this.render()
    this.revealSounds(submission.result.states)
    const delay = 5 * 150 + 240
    this.revealTimer = window.setTimeout(() => {
      if (this.isDisposed) return
      this.pendingReveal = false
      if (submission.status === 'won') this.finishWin()
      else if (submission.status === 'lost') this.finishLoss()
      else this.render()
    }, delay)
  }

  private revealSounds(states: LetterState[]): void {
    states.forEach((state, index) => {
      window.setTimeout(() => this.audio.play(state === 'correct' ? 'correct' : state === 'present' ? 'present' : 'absent'), index * 150)
    })
  }

  private rejectGuess(message: string): void {
    this.invalidRow = true
    this.audio.play('absent')
    this.render()
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => {
      this.invalidRow = false
      this.render()
    }, 850)
    this.showToast(message)
  }

  private finishWin(): void {
    if (!this.round) return
    const stats = this.state.languages[this.state.selectedLanguage]
    const streak = this.streakManager.win(stats)
    this.isNewRecord = streak.record
    this.roundScore = this.scoreManager.pointsForWin(this.attemptsUsed, streak.streak - 1)
    this.statsManager.recordWin(stats, this.attemptsUsed, this.roundScore)
    this.state.score += this.roundScore
    this.state.xp += this.scoreManager.xpForWin(this.roundScore)
    this.state.level = this.scoreManager.levelForXp(this.state.xp)
    this.elapsedSeconds = Math.max(1, Math.round((Date.now() - this.roundStartedAt) / 1000))
    this.lastResult = 'win'
    this.screen = 'result'
    this.audio.play(streak.record ? 'record' : 'win')
    this.persist()
    this.render()
  }

  private finishLoss(): void {
    if (!this.round) return
    const stats = this.state.languages[this.state.selectedLanguage]
    this.streakBeforeLoss = stats.currentStreak
    this.statsManager.recordLoss(stats, this.attemptsUsed)
    this.streakManager.lose(stats)
    this.elapsedSeconds = Math.max(1, Math.round((Date.now() - this.roundStartedAt) / 1000))
    this.lastResult = 'loss'
    this.screen = 'result'
    this.audio.play('loss')
    this.persist()
    this.render()
  }

  private claimSecondChance(): void {
    if (!this.round || !this.adService.canOfferSecondChance() || !this.adService.grantSecondChance()) return
    if (!this.round.grantSecondChance()) return
    const stats = this.state.languages[this.state.selectedLanguage]
    stats.totalAttempts = Math.max(0, stats.totalAttempts - this.attemptsUsed)
    stats.currentStreak = this.streakBeforeLoss
    this.lastResult = null
    this.screen = 'game'
    this.persist()
    this.showToast('FINAL GUESS GRANTED')
    this.render()
  }

  private keyboardStates(): Map<string, LetterState> {
    const priority: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 }
    const states = new Map<string, LetterState>()
    for (const guess of this.round?.guesses ?? []) {
      Array.from(guess.word).forEach((letter, index) => {
        const candidate = guess.states[index]
        if (!states.has(letter) || priority[candidate] > priority[states.get(letter)!]) states.set(letter, candidate)
      })
    }
    return states
  }

  private persist(): void {
    this.saveService.save(this.state)
  }

  private showToast(message: string): void {
    this.root.querySelector<HTMLElement>('.toast-message')?.remove()
    const toast = document.createElement('div')
    toast.className = 'toast-message'
    toast.setAttribute('role', 'status')
    toast.textContent = message
    this.root.append(toast)
    window.setTimeout(() => toast.remove(), 1500)
  }

  private render(): void {
    this.root.classList.toggle('is-colorblind', this.state.settings.colorblind)
    switch (this.screen) {
      case 'title': this.renderTitle(); break
      case 'language': this.renderLanguage(); break
      case 'game': this.renderGame(); break
      case 'result': this.renderResult(); break
      case 'stats': this.renderStats(); break
      case 'settings': this.renderSettings(); break
    }
  }

  private renderHeader(showStreak = true): string {
    const stats = this.state.languages[this.state.selectedLanguage]
    return `<header class="topbar">
      <button class="brand" data-action="menu" aria-label="PixelWords home"><span class="brand-glyph">P</span><span><b>PIXELWORDS</b><small>PIXELTRADE STUDIOS</small></span></button>
      <div class="top-actions">
        <button class="language-chip" data-action="language" aria-label="Change language">${LANGUAGES[this.state.selectedLanguage].flag} ${LANGUAGES[this.state.selectedLanguage].code.toUpperCase()}</button>
        ${showStreak ? `<div class="streak-chip"><span>✦</span><strong>${stats.currentStreak}</strong><small>STREAK</small></div>` : ''}
        <button class="icon-button" data-action="settings" aria-label="Settings">⚙</button>
      </div>
    </header>`
  }

  private renderTitle(): void {
    const stats = this.state.languages[this.state.selectedLanguage]
    const rank = this.streakManager.rankForBest(Math.max(...LANGUAGE_CODES.map((code) => this.state.languages[code].bestStreak)))
    this.root.innerHTML = `<main class="app-frame screen-title">
      ${this.renderHeader(false)}
      <section class="title-stage">
        <div class="hero-sigil" aria-hidden="true"><i>W</i><b>5</b><em>✦</em></div>
        <p class="eyebrow">A WORD GAME BY PIXELTRADE STUDIOS</p>
        <h1>PIXEL<span>WORDS</span></h1>
        <p class="tagline">GUESS <i>·</i> STREAK <i>·</i> MASTER</p>
        <div class="hero-stats"><span><b>🔥 ${stats.currentStreak}</b><small>NOW</small></span><span><b>✦ ${stats.bestStreak}</b><small>BEST · ${rank}</small></span><span><b>${this.state.score.toLocaleString()}</b><small>SCORE</small></span></div>
        <button class="primary-button play-button" data-action="play"><span>PLAY WORD</span><b>↗</b></button>
        <div class="title-links"><button data-action="language">LANGUAGE <span>${LANGUAGES[this.state.selectedLanguage].flag}</span></button><button data-action="stats">STATS <span>↗</span></button></div>
        <div class="title-wordmark"><span>FIVE LETTERS</span><i></i><span>FIVE LANGUAGES</span><i></i><span>INFINITE RUNS</span></div>
      </section>
    </main>`
  }

  private renderLanguage(): void {
    this.root.innerHTML = `<main class="app-frame screen-language">
      ${this.renderHeader(false)}
      <section class="subscreen-content">
        <button class="back-link" data-action="back">← BACK</button>
        <p class="eyebrow">PICK YOUR PLAYING FIELD</p>
        <h1>Choose a<br><span>language.</span></h1>
        <div class="language-list">${LANGUAGE_CODES.map((code, index) => {
          const language = LANGUAGES[code]
          return `<button class="language-option ${code === this.state.selectedLanguage ? 'is-selected' : ''}" data-language="${code}" style="--i:${index}">
            <span class="language-flag">${language.flag}</span><span class="language-name"><b>${language.label}</b><small>${language.nativeName.toUpperCase()} WORDS</small></span>
            <span class="language-best">✦ ${this.state.languages[code].bestStreak}</span><span class="option-arrow">↗</span>
          </button>`
        }).join('')}</div>
        <p class="language-footnote">Words are picked from a local curated list.<br>No network connection needed.</p>
      </section>
    </main>`
  }

  private renderGame(): void {
    const round = this.round
    if (!round) return this.renderLanguage()
    const language = LANGUAGES[this.state.selectedLanguage]
    const levelXp = this.scoreManager.xpIntoLevel(this.state.xp)
    const levelProgress = Math.min(100, levelXp.current / levelXp.required * 100)
    const rows = Math.max(5, round.allowedAttempts)
    const guessRows = Array.from({ length: rows }, (_, rowIndex) => {
      const guess = round.guesses[rowIndex]
      const active = !guess && rowIndex === round.guesses.length
      const letters = guess ? Array.from(guess.word) : active ? Array.from(round.currentInput) : []
      return `<div class="guess-row ${active && this.invalidRow ? 'is-invalid' : ''}" role="row" aria-label="Guess ${rowIndex + 1}">${Array.from({ length: 5 }, (_, col) => {
        const letter = letters[col] ?? ''
        const state = guess?.states[col]
        const classes = ['tile', letter ? 'has-letter' : '', state ? `tile-${state}` : '', guess ? 'is-revealed' : ''].filter(Boolean).join(' ')
        const marker = state === 'correct' ? '✓' : state === 'present' ? '•' : state === 'absent' ? '×' : ''
        const delay = guess ? `style="--flip-delay:${col * 130}ms"` : ''
        return `<div class="${classes}" ${delay} role="gridcell" aria-label="${letter ? `${letter} ${state ?? ''}` : 'empty'}"><span>${escapeHtml(letter ?? '')}</span>${marker ? `<i>${marker}</i>` : ''}</div>`
      }).join('')}</div>`
    }).join('')
    const keyboardState = this.keyboardStates()
    const extras = language.keyboardLetters.filter((letter) => !'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(letter))
    const keyboardRow = (letters: string[]) => `<div class="keyboard-row">${letters.map((letter) => {
      const state = keyboardState.get(letter)
      return `<button class="key ${state ? `key-${state}` : ''}" data-key="${letter}" aria-label="${letter}">${letter}</button>`
    }).join('')}</div>`

    this.root.innerHTML = `<main class="app-frame screen-game">
      ${this.renderHeader()}
      <section class="game-shell">
        <div class="round-meta"><span class="language-label">${language.flag} ${language.label.toUpperCase()}</span><span class="level-progress"><b>LV ${this.state.level}</b><small>${this.levelTitle()}</small><i><em style="width:${levelProgress}%"></em></i></span><span class="round-hint">FIND THE HIDDEN WORD <b>·</b> 5 GUESSES</span><span class="round-score">✦ ${this.state.score.toLocaleString()}</span></div>
        <div class="feedback-legend" aria-label="Letter feedback"><span><i class="legend-correct">✓</i> RIGHT SPOT</span><span><i class="legend-present">•</i> IN WORD</span><span><i class="legend-absent">×</i> NOT IN WORD</span></div>
        <div class="board-wrap ${this.invalidRow ? 'shake-board' : ''}">
          <div class="guess-board" role="grid" aria-label="Five by five guess board">${guessRows}</div>
        </div>
        <div class="keyboard" aria-label="On-screen keyboard">
          ${keyboardRow(KEY_ROWS[0].split(''))}
          ${keyboardRow(KEY_ROWS[1].split(''))}
          <div class="keyboard-row keyboard-row-bottom"><button class="key key-action" data-action="enter">ENTER</button>${keyboardRow(KEY_ROWS[2].split('')).replace('<div class="keyboard-row">', '').replace('</div>', '')}<button class="key key-action key-delete" data-action="backspace" aria-label="Backspace">⌫</button></div>
          ${extras.length ? `<div class="accent-keys" aria-label="Accented letters">${extras.map((letter) => `<button class="accent-key" data-key="${letter}">${letter}</button>`).join('')}</div>` : ''}
        </div>
        <div class="play-footer"><span>ENTER TO SUBMIT</span><i></i><span>⌫ TO DELETE</span><button data-action="menu">QUIT ROUND</button></div>
      </section>
    </main>`
    this.root.querySelectorAll<HTMLElement>('.guess-row')[round.guesses.length]?.setAttribute('aria-current', 'true')
    if (this.pendingReveal) this.root.classList.add('is-revealing')
  }

  private renderResult(): void {
    const round = this.round
    if (!round) return this.renderTitle()
    const won = this.lastResult === 'win'
    const stats = this.state.languages[this.state.selectedLanguage]
    const attemptLabel = `${this.attemptsUsed} ${this.attemptsUsed === 1 ? 'GUESS' : 'GUESSES'}`
    const rank = this.streakManager.rankForBest(stats.bestStreak)
    const resultBody = won
      ? `<div class="result-stamp stamp-win">${stats.currentStreak >= 20 ? 'UNSTOPPABLE!' : stats.currentStreak >= 10 ? 'WORD MASTER!' : stats.currentStreak >= 5 ? 'ON FIRE!' : stats.currentStreak >= 3 ? 'NICE!' : 'CORRECT!'}</div>
         <p class="result-word">${escapeHtml(round.target)}</p>
         <div class="result-grid"><span><b>${attemptLabel}</b><small>ATTEMPTS</small></span><span><b>${this.elapsedSeconds}s</b><small>TIME</small></span><span><b>+${this.roundScore}</b><small>SCORE</small></span></div>
         ${this.isNewRecord ? `<div class="record-callout">NEW BEST! <b>🔥 ${stats.bestStreak}</b></div>` : ''}`
      : `<div class="result-stamp stamp-loss">THE WORD WAS</div>
         <p class="result-word">${escapeHtml(round.target)}</p>
         <div class="loss-note">STREAK ENDED <b>·</b> BEST ${stats.bestStreak} <b>·</b> ${rank}</div>
         <div class="result-grid"><span><b>${this.state.score.toLocaleString()}</b><small>TOTAL SCORE</small></span><span><b>${this.elapsedSeconds}s</b><small>TIME</small></span></div>
         ${this.adService.canOfferSecondChance() ? `<button class="shield-button" data-action="second-chance"><span>◇</span><b>SAVE YOUR STREAK</b><small>OPTIONAL · MOCK REWARD</small></button>` : ''}`
    this.root.innerHTML = `<main class="app-frame screen-result ${won ? 'result-win' : 'result-loss'}">
      ${this.renderHeader()}
      <section class="result-content ${won ? 'celebrate' : ''}">
        <div class="result-mark">${won ? '✦' : '↘'}</div>
        ${resultBody}
        <button class="primary-button next-button" data-action="next"><span>${won ? 'NEXT WORD' : 'TRY AGAIN'}</span><b>↗</b></button>
        <button class="quiet-button" data-action="menu">BACK TO PIXELWORDS</button>
      </section>
    </main>`
    if (won) this.spawnParticles(stats.currentStreak === stats.bestStreak ? 28 : 14)
  }

  private renderStats(): void {
    const overallPlayed = LANGUAGE_CODES.reduce((sum, code) => sum + this.state.languages[code].gamesPlayed, 0)
    const overallWon = LANGUAGE_CODES.reduce((sum, code) => sum + this.state.languages[code].gamesWon, 0)
    const overallBest = Math.max(...LANGUAGE_CODES.map((code) => this.state.languages[code].bestStreak))
    const bestLanguage = this.statsManager.bestLanguage(this.state.languages)
    this.root.innerHTML = `<main class="app-frame screen-stats">
      ${this.renderHeader(false)}
      <section class="subscreen-content stats-content">
        <button class="back-link" data-action="back">← BACK</button>
        <p class="eyebrow">YOUR WORD TRAIL</p><h1>Stats &<br><span>streaks.</span></h1>
        <div class="stats-overview"><div><b>${overallPlayed}</b><small>GAMES PLAYED</small></div><div><b>${overallPlayed ? Math.round(overallWon / overallPlayed * 100) : 0}%</b><small>WIN RATE</small></div><div><b>✦ ${overallBest}</b><small>BEST STREAK</small></div><div><b>${this.state.score.toLocaleString()}</b><small>TOTAL SCORE</small></div></div>
        <div class="language-stats-list">${LANGUAGE_CODES.map((code) => {
          const language = LANGUAGES[code]
          const stats = this.state.languages[code]
          return `<article class="language-stat-row"><div class="language-stat-title"><span>${language.flag}</span><b>${language.label}</b><small>${this.streakManager.rankForBest(stats.bestStreak)}</small></div><div><strong>${stats.gamesPlayed}</strong><small>PLAYED</small></div><div><strong>${this.statsManager.winRate(stats)}%</strong><small>WIN RATE</small></div><div><strong>🔥 ${stats.currentStreak}</strong><small>STREAK</small></div><div><strong>✦ ${stats.bestStreak}</strong><small>BEST</small></div><div><strong>${this.statsManager.averageAttempts(stats)}</strong><small>AVG GUESSES</small></div></article>`
        }).join('')}</div>
        ${bestLanguage ? `<p class="best-language-note">YOUR TOP LANGUAGE <b>${LANGUAGES[bestLanguage].flag} ${LANGUAGES[bestLanguage].label}</b></p>` : ''}
      </section>
    </main>`
  }

  private renderSettings(): void {
    this.root.innerHTML = `<main class="app-frame screen-settings">
      ${this.renderHeader(false)}
      <section class="subscreen-content settings-content">
        <button class="back-link" data-action="back">← BACK</button>
        <p class="eyebrow">MAKE IT YOURS</p><h1>Game<br><span>settings.</span></h1>
        <div class="settings-list">
          <button data-action="music" class="setting-row"><span class="setting-symbol">♫</span><span><b>Music</b><small>Soft ambient loop</small></span><i class="toggle ${this.state.settings.music ? 'is-on' : ''}"></i></button>
          <button data-action="sfx" class="setting-row"><span class="setting-symbol">◖</span><span><b>Sound effects</b><small>Keys, reveals and wins</small></span><i class="toggle ${this.state.settings.sfx ? 'is-on' : ''}"></i></button>
          <button data-action="colorblind" class="setting-row"><span class="setting-symbol">◈</span><span><b>Pattern feedback</b><small>Extra symbols for tile states</small></span><i class="toggle ${this.state.settings.colorblind ? 'is-on' : ''}"></i></button>
        </div>
        <p class="settings-footnote">Your score and language streaks stay on this device.</p>
      </section>
    </main>`
  }

  private spawnParticles(count: number): void {
    const burst = this.root.querySelector<HTMLElement>('.result-mark')
    if (!burst) return
    for (let index = 0; index < count; index++) {
      const particle = document.createElement('i')
      particle.className = 'pixel-particle'
      particle.style.setProperty('--x', `${Math.cos(index / count * Math.PI * 2) * (34 + index % 4 * 13)}px`)
      particle.style.setProperty('--y', `${Math.sin(index / count * Math.PI * 2) * (34 + index % 5 * 10)}px`)
      particle.style.setProperty('--wait', `${index % 7 * 18}ms`)
      burst.append(particle)
    }
  }

  private levelTitle(): string {
    if (this.state.level >= 50) return 'LANGUAGE LEGEND'
    if (this.state.level >= 20) return 'WORD MASTER'
    if (this.state.level >= 10) return 'WORD EXPERT'
    if (this.state.level >= 5) return 'WORD HUNTER'
    return 'BEGINNER'
  }
}
