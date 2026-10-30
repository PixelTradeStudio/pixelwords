import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultSave } from '../src/data/GameTypes.ts'
import { SaveService, type StorageLike } from '../src/services/SaveService.ts'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('SaveService', () => {
  it('round-trips language, score, settings, and independent streaks', () => {
    const storage = new MemoryStorage()
    const service = new SaveService(storage)
    const save = createDefaultSave()
    save.selectedLanguage = 'fr'
    save.score = 1250
    save.languages.fr.bestStreak = 8
    save.settings.colorblind = true
    service.save(save)
    const loaded = service.load()
    assert.equal(loaded.selectedLanguage, 'fr')
    assert.equal(loaded.score, 1250)
    assert.equal(loaded.languages.fr.bestStreak, 8)
    assert.equal(loaded.languages.en.bestStreak, 0)
    assert.equal(loaded.settings.colorblind, true)
  })

  it('recovers safely from corrupt and unsupported save data', () => {
    const storage = new MemoryStorage()
    const service = new SaveService(storage)
    storage.setItem('pixelwords-save-v1', '{bad json')
    assert.equal(service.load().selectedLanguage, 'en')
    storage.setItem('pixelwords-save-v1', JSON.stringify({ version: 99, score: 400 }))
    assert.equal(service.load().score, 0)
  })
})
