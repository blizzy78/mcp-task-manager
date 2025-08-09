export function dedup<T>(array: Array<T>) {
  const seen = new Set<T>()

  return Array.from(
    array.filter((item) => {
      if (seen.has(item)) {
        return false
      }

      seen.add(item)

      return true
    })
  )
}
