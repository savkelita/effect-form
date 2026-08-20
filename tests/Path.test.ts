import { describe, expect, it } from 'vitest'
import * as Path from '../src/Path'

describe('Path', () => {
  describe('equals', () => {
    it('compares segment by segment', () => {
      expect(Path.equals(['a', 0, 'b'], ['a', 0, 'b'])).toBe(true)
      expect(Path.equals(['a'], ['a', 0])).toBe(false)
      expect(Path.equals([], [])).toBe(true)
    })

    // A list index is a number; the string of the same digits is a field name.
    it('does not mix an index with a field name', () => {
      expect(Path.equals(['a', 0], ['a', '0'])).toBe(false)
    })
  })

  describe('isPrefix', () => {
    it('holds for a shorter path that starts the same way', () => {
      expect(Path.isPrefix(['a'], ['a', 0, 'b'])).toBe(true)
      expect(Path.isPrefix([], ['a'])).toBe(true)
      expect(Path.isPrefix(['a', 0, 'b'], ['a', 0, 'b'])).toBe(true)
    })

    it('fails for a longer path or a different one', () => {
      expect(Path.isPrefix(['a', 0], ['a'])).toBe(false)
      expect(Path.isPrefix(['b'], ['a', 'b'])).toBe(false)
    })
  })

  describe('toId', () => {
    it('joins the prefix and every segment with a dash', () => {
      expect(Path.toId('ef', ['address', 0, 'street'])).toBe('ef-address-0-street')
    })

    it('gives the prefix alone at the root', () => {
      expect(Path.toId('ef', [])).toBe('ef')
    })
  })

  describe('toName', () => {
    it('writes the HTML name: parent[child], parent[index]', () => {
      expect(Path.toName(['address', 0, 'street'])).toBe('address[0][street]')
      expect(Path.toName(['name'])).toBe('name')
    })

    it('is empty at the root', () => {
      expect(Path.toName([])).toBe('')
    })
  })

  // This table is the contract: `humanize` only has to be predictable, and the acronym
  // case below is accepted rather than special-cased.
  describe('humanize', () => {
    const table: ReadonlyArray<readonly [string, string]> = [
      ['name', 'Name'],
      ['firstName', 'First name'],
      ['user_id', 'User'],
      ['itemID', 'Item'],
      ['id', 'Id'],
      ['first-name', 'First name'],
      ['  spaced  out ', 'Spaced out'],
      ['address2', 'Address2'],
      ['myURLValue', 'My urlvalue'],
      ['', ''],
    ]

    it.each(table)('%j -> %j', (input, expected) => {
      expect(Path.humanize(input)).toBe(expected)
    })
  })
})
