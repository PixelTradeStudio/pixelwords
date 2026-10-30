export class MockAdService {
  private available = true

  public canOfferSecondChance(): boolean {
    return this.available
  }

  public grantSecondChance(): boolean {
    if (!this.available) return false
    this.available = false
    return true
  }

  public resetRound(): void {
    this.available = true
  }
}
