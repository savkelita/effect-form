/**
 * Annotations through which a domain type carries its own form behaviour.
 *
 * `Schema` is an immutable value, so every combinator returns a new schema.
 *
 * @since 0.0.0
 */
import { Option, type Schema, type SchemaAST as AST } from 'effect'
import type { Locals } from './Locals'

/**
 * Draws one field. `Dom` is free, so the core knows nothing about React.
 *
 * `V` is the FORM value: the ENCODED side of the schema, widened for a field that may
 * still be empty. A number field holds the text that was typed (`I`) while the schema
 * validates to `number` (`A`). Hence `I extends V` — a template must accept at least
 * everything the form can hold.
 *
 * @since 0.0.0
 * @category Model
 */
export type Template<V, Dom, O = unknown> = (locals: Locals<V, O>) => Dom

/**
 * Error message. Receives the FORM value, like `Template`: validation failed, so no
 * decoded value exists.
 *
 * @since 0.0.0
 * @category Model
 */
export type Message<V> = (value: V) => string | undefined

const TemplateId = Symbol.for('effect-form/annotation/Template')
const MessageId = Symbol.for('effect-form/annotation/Message')
const AttrsId = Symbol.for('effect-form/annotation/Attrs')
const LabelId = Symbol.for('effect-form/annotation/Label')

// Effect types annotation keys as strings; the symbols survive at runtime, and keep the
// form's keys apart from Effect's own.
const annotate = <S extends Schema.Top>(self: S, key: symbol, value: unknown): S['Rebuild'] =>
  self.annotate({ [key]: value } as Schema.Annotations.Bottom<S['Type'], S['~type.parameters']>)

/**
 * Attaches a template to a domain type.
 *
 * @example
 * ```ts
 * export const vForm = Schema.String.pipe(
 *   Schema.check(Schema.isMaxLength(80)),
 *   Annotation.template(nameTemplate),
 * )
 * ```
 *
 * @since 0.0.0
 * @category Combinators
 */
export const template =
  <V, Dom, O = unknown>(tpl: Template<V, Dom, O>) =>
  <S extends Schema.Top & { readonly Encoded: V }>(self: S): S['Rebuild'] =>
    annotate(self, TemplateId, tpl)

/**
 * Attaches an error message to a domain type. Returning `undefined` keeps the message
 * Effect produced.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const message =
  <V>(msg: Message<V>) =>
  <S extends Schema.Top & { readonly Encoded: V }>(self: S): S['Rebuild'] =>
    annotate(self, MessageId, msg)

/**
 * Default label of a domain type.
 *
 * Deliberately a key of its own rather than `Schema.annotate({ title })`, so nothing
 * Effect writes into a schema's annotations can overwrite the label.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const label =
  (text: string) =>
  <S extends Schema.Top>(self: S): S['Rebuild'] =>
    annotate(self, LabelId, text)

/**
 * Default attrs of a domain type; the screen adds to them through `options`.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const attrs =
  (value: Readonly<Record<string, unknown>>) =>
  <S extends Schema.Top>(self: S): S['Rebuild'] =>
    annotate(self, AttrsId, value)

/**
 * A node's annotation layers, outermost first. A check takes the annotations given after
 * it, so the last check is the outermost layer and the node's own annotations the innermost.
 */
type Layer = Readonly<Record<symbol, unknown>>

const layers = (ast: AST.AST): ReadonlyArray<Layer> => {
  const out: Array<Layer> = []
  for (const check of [...(ast.checks ?? [])].reverse()) {
    if (check.annotations !== undefined) out.push(check.annotations as Layer)
  }
  if (ast.annotations !== undefined) out.push(ast.annotations as Layer)
  return out
}

const has = (layer: Layer, key: symbol): boolean => Object.prototype.hasOwnProperty.call(layer, key)

const outermost =
  <T>(key: symbol) =>
  (ast: AST.AST): Option.Option<T> => {
    const layer = layers(ast).find(l => has(l, key))
    return layer === undefined ? Option.none() : Option.some(layer[key] as T)
  }

/**
 * @since 0.0.0
 * @category Getters
 */
export const getTemplate: (ast: AST.AST) => Option.Option<Template<never, unknown>> =
  outermost<Template<never, unknown>>(TemplateId)

/**
 * @since 0.0.0
 * @category Getters
 */
export const getMessage: (ast: AST.AST) => Option.Option<Message<never>> = outermost<Message<never>>(MessageId)

/**
 * Attrs are a record, so the layers of a node merge instead of shadowing; the outermost
 * wins per key.
 *
 * @since 0.0.0
 * @category Getters
 */
export const getAttrs = (ast: AST.AST): Option.Option<Readonly<Record<string, unknown>>> => {
  const found = layers(ast).filter(l => has(l, AttrsId))
  return found.length === 0
    ? Option.none()
    : Option.some(
        found.reduceRight<Record<string, unknown>>(
          (acc, l) => ({ ...acc, ...(l[AttrsId] as Readonly<Record<string, unknown>>) }),
          {},
        ),
      )
}

/**
 * @since 0.0.0
 * @category Getters
 */
export const getLabel: (ast: AST.AST) => Option.Option<string> = outermost<string>(LabelId)
