import { describe, expect, it } from 'vitest'
import { RULES_PACKAGE_READY } from '../src/index.js'

describe('packages/rules scaffold', () => {
  it('is wired up and importable', () => {
    expect(RULES_PACKAGE_READY).toBe(true)
  })
})
