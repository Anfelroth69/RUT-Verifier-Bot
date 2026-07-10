class Semaphore {
  private permits: number
  private queue: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--
      return () => this.release()
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.permits--
        resolve(() => this.release())
      })
    })
  }

  private release(): void {
    this.permits++
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    }
  }
}

// Singleton: limit to 1 concurrent Playwright instance (critical for 512MB RAM)
export const semaphore = new Semaphore(1)
