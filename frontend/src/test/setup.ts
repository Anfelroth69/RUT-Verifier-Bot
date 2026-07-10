import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Polyfill localStorage for jsdom (Node 22+ requires --localstorage-file)
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem(key: string) { return store.get(key) ?? null },
    setItem(key: string, value: string) { store.set(key, String(value)) },
    removeItem(key: string) { store.delete(key) },
    clear() { store.clear() },
    get length() { return store.size },
    key(index: number) { return [...store.keys()][index] ?? null },
  }
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})
