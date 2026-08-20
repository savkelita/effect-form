/**
 * Path to a field in the form.
 *
 * @since 0.0.0
 */

/**
 * A number is a list index, a string is a field name.
 *
 * @since 0.0.0
 * @category Model
 */
export type Segment = string | number

/**
 * @since 0.0.0
 * @category Model
 */
export type Path = ReadonlyArray<Segment>

/**
 * @since 0.0.0
 * @category Utils
 */
export const equals = (a: Path, b: Path): boolean => a.length === b.length && a.every((s, i) => s === b[i])

/**
 * @since 0.0.0
 * @category Utils
 */
export const isPrefix = (prefix: Path, path: Path): boolean =>
  prefix.length <= path.length && prefix.every((s, i) => s === path[i])

/**
 * Deterministic DOM id. Never parsed back.
 *
 * @since 0.0.0
 * @category Utils
 */
export const toId = (prefix: string, path: Path): string => [prefix, ...path.map(String)].join('-')

/**
 * HTML `name`: `parent[child]`, `parent[0]`.
 *
 * @since 0.0.0
 * @category Utils
 */
export const toName = (path: Path): string =>
  path.reduce<string>((acc, s) => (acc === '' ? String(s) : `${acc}[${String(s)}]`), '')

/**
 * `firstName` -> `'First name'`, `user_id` -> `'User'`.
 *
 * Behaviour on acronyms (`myURLValue` -> `'My urlvalue'`) is deliberate; the table in the
 * test is the contract.
 *
 * @since 0.0.0
 * @category Utils
 */
export const humanize = (s: string): string => {
  const underscored = s
    .trim()
    .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
  const stripped = underscored.replace(/_id$/, '').replace(/_/g, ' ')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}
