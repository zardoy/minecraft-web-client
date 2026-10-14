import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import { detectLoginPrompt, createLoginPromptDebouncer } from './promptDetection'

describe('detectLoginPrompt', () => {
  test('detects AuthMe-like login message', () => {
    expect(detectLoginPrompt('Please log in with /login <password>')).toBe('login')
  })

  test('detects register message', () => {
    expect(detectLoginPrompt('You are not registered. Use /register <password> <password>')).toBe('register')
  })

  test('detects combined login or register as either', () => {
    expect(detectLoginPrompt('Please /login or /register')).toBe('either')
  })

  test('strips Minecraft color codes before matching', () => {
    expect(detectLoginPrompt('\u00A7a/login \u00A7c<password>')).toBe('login')
  })

  test('detects Russian login prompt', () => {
    expect(detectLoginPrompt('Пожалуйста используйте /login <пароль>')).toBe('login')
  })

  test('detects "type /register"', () => {
    expect(detectLoginPrompt('type /register <password> <password>')).toBe('register')
  })

  test('returns null for password reminder without slash command', () => {
    expect(detectLoginPrompt('Welcome! Your password reminder: be safe.')).toBeNull()
  })

  test('returns null when "login" word appears without slash command', () => {
    expect(detectLoginPrompt('Player typed /tell something with login word')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(detectLoginPrompt('')).toBeNull()
  })

  test('returns null for unrelated chat', () => {
    expect(detectLoginPrompt('Steve: anyone got diamonds?')).toBeNull()
  })

  test('detects changepassword prompt', () => {
    expect(detectLoginPrompt('Use /changepassword <old> <new>')).toBe('changepassword')
  })

  test('detects unregister prompt', () => {
    expect(detectLoginPrompt('You can delete your account with /unregister')).toBe('unregister')
  })

  test('detects Russian changepassword prompt', () => {
    expect(detectLoginPrompt('Используйте /changepassword для смены пароля')).toBe('changepassword')
  })

  test('does not match /loginfoo (word boundary)', () => {
    expect(detectLoginPrompt('try /loginfoo to do something')).toBeNull()
  })
})

describe('createLoginPromptDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('first call triggers, immediate second does not, then triggers again after interval', () => {
    const d = createLoginPromptDebouncer(30_000)
    expect(d.shouldTrigger('srv1')).toBe(true)
    expect(d.shouldTrigger('srv1')).toBe(false)
    vi.advanceTimersByTime(29_999)
    expect(d.shouldTrigger('srv1')).toBe(false)
    vi.advanceTimersByTime(2)
    expect(d.shouldTrigger('srv1')).toBe(true)
  })

  test('different server keys are independent', () => {
    const d = createLoginPromptDebouncer(30_000)
    expect(d.shouldTrigger('a')).toBe(true)
    expect(d.shouldTrigger('b')).toBe(true)
    expect(d.shouldTrigger('a')).toBe(false)
    expect(d.shouldTrigger('b')).toBe(false)
  })

  test('reset(serverKey) allows immediate retrigger', () => {
    const d = createLoginPromptDebouncer(30_000)
    expect(d.shouldTrigger('a')).toBe(true)
    expect(d.shouldTrigger('a')).toBe(false)
    d.reset('a')
    expect(d.shouldTrigger('a')).toBe(true)
  })

  test('reset() clears all keys', () => {
    const d = createLoginPromptDebouncer(30_000)
    d.shouldTrigger('a')
    d.shouldTrigger('b')
    d.reset()
    expect(d.shouldTrigger('a')).toBe(true)
    expect(d.shouldTrigger('b')).toBe(true)
  })

  test('default interval is 30s', () => {
    const d = createLoginPromptDebouncer()
    expect(d.shouldTrigger('a')).toBe(true)
    vi.advanceTimersByTime(29_999)
    expect(d.shouldTrigger('a')).toBe(false)
    vi.advanceTimersByTime(2)
    expect(d.shouldTrigger('a')).toBe(true)
  })
})
