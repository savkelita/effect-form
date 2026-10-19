/**
 * Descent through the AST to the domain type.
 *
 * Annotations stay where they were written and do not move onto wrappers: with
 * `Schema.NullOr(Name)` they sit on the union member, with a transformation on the
 * encoded side. Without this descent neither would find its template.
 *
 * @since 0.0.0
 */
import { Option, SchemaAST as AST } from 'effect'
import * as Annotation from './Annotation'

/**
 * @since 0.0.0
 * @category Model
 */
export interface TypeInfo {
  /** What was given, wrappers and all. */
  readonly ast: AST.AST
  /** The domain type that was reached — the one carrying the template. */
  readonly innerAst: AST.AST
  /** Reached through `NullOr` / `optional` — the field may be left empty. */
  readonly isMaybe: boolean
  readonly template: Option.Option<Annotation.Template<never, unknown>>
  readonly message: Option.Option<Annotation.Message<never>>
  readonly attrs: Option.Option<Readonly<Record<string, unknown>>>
  readonly label: Option.Option<string>
}

/** `null` and `undefined` union members are a wrapper, not a choice. */
const isNullish = (ast: AST.AST): boolean => AST.isUndefined(ast) || AST.isNull(ast)

const hasTemplate = (ast: AST.AST): boolean => Option.isSome(Annotation.getTemplate(ast))

/** First annotation found walking outwards in, so the outermost one wins. */
const outermost =
  <T>(get: (ast: AST.AST) => Option.Option<T>) =>
  (chain: ReadonlyArray<AST.AST>): Option.Option<T> =>
    chain.reduce<Option.Option<T>>((acc, node) => Option.orElse(acc, () => get(node)), Option.none())

/** Attrs are a record, so they merge across the chain too; the outermost wins per key. */
const mergedAttrs = (chain: ReadonlyArray<AST.AST>): Option.Option<Readonly<Record<string, unknown>>> => {
  const found = chain.map(Annotation.getAttrs).filter(Option.isSome)
  return found.length === 0
    ? Option.none()
    : Option.some(found.reduceRight<Record<string, unknown>>((acc, a) => ({ ...acc, ...a.value }), {}))
}

/**
 * Descends until it finds a template, remembering every node it passed.
 *
 * Stops as soon as it finds one, so a check over an already annotated domain type may
 * override the template, and inherits it when it does not. The other annotations are
 * resolved over the whole chain: a check can give the narrower rule its own message
 * without restating the rest of the type.
 *
 * @since 0.0.0
 * @category Constructors
 */
export const getTypeInfo = (ast: AST.AST): TypeInfo => {
  const chain: Array<AST.AST> = [ast]
  let current = ast
  let isMaybe = false
  let links: ReadonlyArray<AST.Link> = []

  for (;;) {
    if (hasTemplate(current)) break

    // Towards the encoded side: the form holds the ENCODED value, and so do the issue paths.
    const encoding = links.length > 0 ? links : (current.encoding ?? [])
    if (encoding.length > 0) {
      current = encoding[0]!.to
      links = encoding.slice(1)
      chain.push(current)
      continue
    }

    if (AST.isSuspend(current)) {
      current = current.thunk()
      chain.push(current)
      continue
    }

    if (AST.isUnion(current)) {
      const real = current.types.filter(t => !isNullish(t))
      // A real union (more than one choice) is not a wrapper, so the descent stops.
      if (real.length === 1 && real.length < current.types.length) {
        isMaybe = true
        current = real[0]!
        chain.push(current)
        continue
      }
    }

    break
  }

  return {
    ast,
    innerAst: current,
    isMaybe,
    template: Annotation.getTemplate(current),
    message: outermost(Annotation.getMessage)(chain),
    attrs: mergedAttrs(chain),
    label: outermost(Annotation.getLabel)(chain),
  }
}
