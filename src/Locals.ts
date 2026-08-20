/**
 * The contract the form hands to a template.
 *
 * `O` are the options the screen gave that field; they arrive typed, so a template
 * never has to reach back into the form to get them.
 *
 * @since 0.0.0
 */
import type * as Path from './Path'

/**
 * @since 0.0.0
 * @category Model
 */
export interface LocalsBase {
  readonly path: Path.Path
  readonly id: string
  readonly name: string
  readonly label: string | undefined
  readonly hasError: boolean
  readonly error: string | undefined
  readonly disabled: boolean
  /** `false` when the field was reached through `NullOr` / `optional`. */
  readonly required: boolean
  readonly attrs: Readonly<Record<string, unknown>>
  readonly config: Readonly<Record<string, unknown>>
}

/**
 * @since 0.0.0
 * @category Model
 */
export type Locals<A, O = unknown> = LocalsBase & {
  readonly value: A
  readonly onChange: (value: A) => void
} & O

/**
 * Already drawn children, keyed by the form value. An open record while `V` is unknown.
 *
 * @since 0.0.0
 * @category Model
 */
export type Inputs<Dom, V> = unknown extends V
  ? Readonly<Record<string, Dom>>
  : { readonly [K in keyof V]-?: Dom }

/**
 * Locals of a container. Children arrive drawn — `locals.inputs.pib`.
 *
 * @since 0.0.0
 * @category Model
 */
export type StructLocals<Dom, V = unknown, O = unknown> = LocalsBase & {
  readonly inputs: Inputs<Dom, V>
} & O

/**
 * @since 0.0.0
 * @category Model
 */
export type StructTemplate<Dom, V = unknown, O = unknown> = (
  locals: StructLocals<Dom, V, O>,
) => Dom
