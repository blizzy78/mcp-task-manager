import { describe, expect, it } from 'vitest'
import { dedup } from './arrays.js'

describe('dedup', () => {
  it('should remove duplicate numbers', () => {
    const input = [1, 2, 2, 3, 1, 4, 3]
    const result = dedup(input)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('should remove duplicate strings', () => {
    const input = ['a', 'b', 'b', 'c', 'a', 'd']
    const result = dedup(input)
    expect(result).toEqual(['a', 'b', 'c', 'd'])
  })

  it('should preserve order of first occurrence', () => {
    const input = [3, 1, 2, 1, 3, 2]
    const result = dedup(input)
    expect(result).toEqual([3, 1, 2])
  })

  it('should handle empty array', () => {
    const input: number[] = []
    const result = dedup(input)
    expect(result).toEqual([])
  })

  it('should handle array with no duplicates', () => {
    const input = [1, 2, 3, 4, 5]
    const result = dedup(input)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle array with all duplicate elements', () => {
    const input = [5, 5, 5, 5]
    const result = dedup(input)
    expect(result).toEqual([5])
  })

  it('should handle single element array', () => {
    const input = [42]
    const result = dedup(input)
    expect(result).toEqual([42])
  })

  it('should handle boolean values', () => {
    const input = [true, false, true, false, true]
    const result = dedup(input)
    expect(result).toEqual([true, false])
  })

  it('should handle mixed primitive types', () => {
    const input = [1, '1', 2, '2', 1, '1']
    const result = dedup(input)
    expect(result).toEqual([1, '1', 2, '2'])
  })

  it('should handle object references', () => {
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    const obj3 = { id: 1 }
    const input = [obj1, obj2, obj1, obj3]
    const result = dedup(input)
    expect(result).toEqual([obj1, obj2, obj3])
  })

  it('should handle null and undefined values', () => {
    const input = [null, undefined, null, undefined, 1, null]
    const result = dedup(input)
    expect(result).toEqual([null, undefined, 1])
  })
})
