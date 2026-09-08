/**
 * Centralized Brand Lookup Helpers
 */
export function buildBrandMap(brands = []) {
  if (!Array.isArray(brands)) return {}
  return brands.reduce((acc, b) => {
    if (b && b.id) {
      acc[b.id] = b.name || 'Sin Marca'
    }
    return acc
  }, {})
}
