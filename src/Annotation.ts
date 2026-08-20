/**
 * Annotations through which a domain type carries its own form behaviour.
 *
 * `Schema` is an immutable value, so every combinator returns a new schema.
 *
 * @since 0.0.0
 */
import { Option, Schema, SchemaAST as AST } from 'effect'
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

/**
 * Attaches a template to a domain type.
 *
 * @example
 * ```ts
 * export const vForm = Schema.String.pipe(
 *   Schema.maxLength(80),
 *   Annotation.template(nameTemplate),
 * )
 * ```
 *
 * @since 0.0.0
 * @category Combinators
 */
export const template =
  <V, Dom, O = unknown>(tpl: Template<V, Dom, O>) =>
  <A, I extends V, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> =>
    self.annotations({ [TemplateId]: tpl })

/**
 * Attaches an error message to a domain type. Returning `undefined` keeps the message
 * Effect produced.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const message =
  <V>(msg: Message<V>) =>
  <A, I extends V, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> =>
    self.annotations({ [MessageId]: msg })

/**
 * Default label of a domain type.
 *
 * Deliberately not `Schema.annotations({ title })`: `Schema.maxLength(80)` and the other
 * constraint combinators write their description there (`"maxLength(80)"`) and would
 * overwrite the label.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const label =
  (text: string) =>
  <A, I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> =>
    self.annotations({ [LabelId]: text })

/**
 * Default attrs of a domain type; the screen adds to them through `options`.
 *
 * @since 0.0.0
 * @category Combinators
 */
export const attrs =
  (value: Readonly<Record<string, unknown>>) =>
  <A, I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> =>
    self.annotations({ [AttrsId]: value })

/**
 * @since 0.0.0
 * @category Getters
 */
export const getTemplate: (ast: AST.AST) => Option.Option<Template<never, unknown>> =
  AST.getAnnotation<Template<never, unknown>>(TemplateId)

/**
 * @since 0.0.0
 * @category Getters
 */
export const getMessage: (ast: AST.AST) => Option.Option<Message<never>> =
  AST.getAnnotation<Message<never>>(MessageId)

/**
 * @since 0.0.0
 * @category Getters
 */
export const getAttrs: (ast: AST.AST) => Option.Option<Readonly<Record<string, unknown>>> =
  AST.getAnnotation<Readonly<Record<string, unknown>>>(AttrsId)

/**
 * @since 0.0.0
 * @category Getters
 */
export const getLabel: (ast: AST.AST) => Option.Option<string> = AST.getAnnotation<string>(LabelId)
