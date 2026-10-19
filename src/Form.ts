/**
 * The form: give it a `Schema.Struct` built out of domain types and it draws the fields.
 *
 * The screen does not choose widgets — the widget already sits on the domain type. The
 * screen gives labels, the layout, and any extra options a widget asks for.
 *
 * @since 0.0.0
 */
import { Option, type Schema, SchemaAST as AST } from 'effect'
import * as Annotation from './Annotation'
import type { Locals, StructLocals, StructTemplate } from './Locals'
import * as Path from './Path'
import { getTypeInfo } from './TypeInfo'
import type { Issue } from './Validation'

/**
 * Options of a container's children, keyed by the form value. `never` for a leaf, which
 * has no children, and an open record while `V` is unknown.
 *
 * @since 0.0.0
 * @category Model
 */
export type Fields<Dom, V> = unknown extends V
  ? Readonly<Record<string, FieldOptions<Dom, unknown>>>
  : [V] extends [ReadonlyArray<unknown>]
    ? never
    : [V] extends [object]
      ? { readonly [K in keyof V]?: FieldOptions<Dom, V[K]> }
      : never

/**
 * Options the screen gives one field. `V` is that field's value, so `fields` and
 * `template` know its keys.
 *
 * Open type: anything past the known keys reaches the template untouched, so a combo can
 * be handed its `model` and `onChange` without a line of support in the library.
 *
 * @since 0.0.0
 * @category Model
 */
export interface FieldOptions<Dom, V = unknown> {
  readonly label?: string
  readonly disabled?: boolean
  readonly attrs?: Readonly<Record<string, unknown>>
  readonly config?: Readonly<Record<string, unknown>>
  /**
   * Container layout. Required — the library has no default look, and children arrive as
   * `locals.inputs.<name>`. The widget of a leaf is not here: it sits on the domain type.
   */
  readonly template?: StructTemplate<Dom, V>
  readonly fields?: Fields<Dom, V>
  readonly [key: string]: unknown
}

/**
 * @since 0.0.0
 * @category Model
 */
export interface Ctx {
  readonly idPrefix: string
  readonly disabled: boolean
  /** `'labels'` derives a label from the field name when the screen gives none. */
  readonly auto: 'labels' | 'none'
}

const defaultCtx: Ctx = { idPrefix: 'ef', disabled: false, auto: 'labels' }

/**
 * @since 0.0.0
 * @category Model
 */
export interface RenderProps<A, I, R, V, Dom> {
  readonly schema: Schema.Codec<A, I, R, unknown>
  /**
   * The FORM value, wider than `A`, because a field may be empty while it is being filled
   * in. The application declares it itself.
   */
  readonly value: V
  readonly onChange: (value: V) => void
  readonly options?: FieldOptions<Dom, V>
  /** Errors by path; the screen decides WHEN to pass them. */
  readonly issues?: ReadonlyArray<Issue>
  readonly ctx?: Partial<Ctx>
}

const record = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

/** Everything the screen wrote except what the walker itself consumes. */
const extras = <Dom>(options: FieldOptions<Dom>): Readonly<Record<string, unknown>> => {
  const { fields, template, ...rest } = options
  return rest
}

/**
 * Fixes `Dom` for the application. Takes nothing — the library has no default look.
 *
 * @example
 * ```ts
 * export const { render } = Form.make<ReactNode>()
 * ```
 *
 * @since 0.0.0
 * @category Constructors
 */
export const make = <Dom>() => {
  const missing = (path: Path.Path, tag: string): never => {
    throw new Error(
      `[effect-form] no template for "${Path.toName(path) || '<root>'}" (${tag}). ` +
        `Leaf: attach one to the domain type with Annotation.template(...). ` +
        `Container: give a layout through options.template.`,
    )
  }

  const walk = (
    ast: AST.AST,
    value: unknown,
    onChange: (value: unknown) => void,
    options: FieldOptions<Dom>,
    issues: ReadonlyArray<Issue>,
    path: Path.Path,
    ctx: Ctx,
  ): Dom => {
    const info = getTypeInfo(ast)
    const own = issues.filter(i => Path.equals(i.path, path))
    const label =
      options.label ??
      Option.getOrUndefined(info.label) ??
      (ctx.auto === 'labels' && typeof path[path.length - 1] === 'string'
        ? Path.humanize(String(path[path.length - 1]))
        : undefined)

    const base = {
      path,
      id: Path.toId(ctx.idPrefix, path),
      name: Path.toName(path),
      label,
      hasError: own.length > 0,
      error: own[0]?.message,
      disabled: options.disabled ?? ctx.disabled,
      required: !info.isMaybe,
      attrs: { ...Option.getOrElse(info.attrs, () => ({})), ...options.attrs },
      config: options.config ?? {},
    }

    // Whether a node is a leaf is decided by the domain type, not by the screen.
    if (Option.isSome(info.template)) {
      const locals = { ...extras(options), ...base, value, onChange } as unknown as Locals<never, never>
      return (info.template.value as unknown as Annotation.Template<never, Dom, never>)(locals)
    }

    // No template on the type: a container. Children are drawn, then handed to the layout.
    if (AST.isObjects(info.innerAst)) {
      const layout = options.template
      if (layout === undefined) return missing(path, 'Struct')

      const parent = record(value)
      const fieldOptions = options.fields ?? {}
      const inputs: Record<string, Dom> = {}

      for (const ps of info.innerAst.propertySignatures) {
        const key = String(ps.name)
        inputs[key] = walk(
          ps.type,
          parent[key],
          childValue => onChange({ ...parent, [key]: childValue }),
          fieldOptions[key] ?? {},
          issues,
          [...path, key],
          ctx,
        )
      }

      return layout({ ...extras(options), ...base, inputs } as StructLocals<Dom>)
    }

    return missing(path, info.innerAst._tag)
  }

  /**
   * Draws the form.
   *
   * @since 0.0.0
   */
  const render = <A, I, R, V>(props: RenderProps<A, I, R, V, Dom>): Dom =>
    walk(
      props.schema.ast,
      props.value,
      props.onChange as (value: unknown) => void,
      (props.options as FieldOptions<Dom> | undefined) ?? {},
      props.issues ?? [],
      [],
      { ...defaultCtx, ...props.ctx },
    )

  return { render } as const
}
