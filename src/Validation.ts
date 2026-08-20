/**
 * Form validation.
 *
 * One mechanism for every error: `Schema.decodeUnknownEither` + `ArrayFormatter`, which
 * gives a path per field with REAL numeric indices for lists.
 *
 * @since 0.0.0
 */
import { Either, Option, ParseResult, Schema, SchemaAST as AST } from 'effect'
import * as Annotation from './Annotation'
import * as Path from './Path'
import { getTypeInfo } from './TypeInfo'

/**
 * @since 0.0.0
 * @category Model
 */
export interface Issue {
  readonly path: Path.Path
  readonly message: string
}

/**
 * @since 0.0.0
 * @category Model
 */
export type Result<A> =
  | { readonly isValid: true; readonly value: A }
  | { readonly isValid: false; readonly issues: ReadonlyArray<Issue> }

/** `PropertyKey` includes symbols, which cannot address a form field. */
const isSegment = (k: PropertyKey): k is Path.Segment => typeof k === 'string' || typeof k === 'number'

/**
 * `ParseError` -> errors by path.
 *
 * @since 0.0.0
 * @category Constructors
 */
export const fromParseError = (error: ParseResult.ParseError): ReadonlyArray<Issue> =>
  ParseResult.ArrayFormatter.formatErrorSync(error).map(i => ({
    path: i.path.filter(isSegment),
    message: i.message,
  }))

/**
 * A union reports one issue per member, so a literal union yields one per literal.
 * Identical `(path, message)` pairs carry nothing extra; different messages on the same
 * path do, and are kept.
 */
const dedupe = (issues: ReadonlyArray<Issue>): ReadonlyArray<Issue> => {
  const seen = new Set<string>()
  return issues.filter(i => {
    const key = `${JSON.stringify(i.path)}|${i.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** A domain type's own message wins over the one Effect produced. */
const overrideMessages = (
  ast: AST.AST,
  issues: ReadonlyArray<Issue>,
  value: unknown,
): ReadonlyArray<Issue> =>
  issues.map(issue => {
    const at = resolve(ast, issue.path)
    if (at === undefined) return issue
    const info = getTypeInfo(at)
    return Option.match(info.message, {
      onNone: () => issue,
      onSome: msg => {
        const custom = (msg as Annotation.Message<unknown>)(valueAt(value, issue.path))
        return custom === undefined ? issue : { ...issue, message: custom }
      },
    })
  })

/** Walks down the AST along an error path. */
const resolve = (ast: AST.AST, path: Path.Path): AST.AST | undefined => {
  let current = ast
  for (const segment of path) {
    const inner = getTypeInfo(current).innerAst
    if (AST.isTypeLiteral(inner) && typeof segment === 'string') {
      const ps = inner.propertySignatures.find(p => p.name === segment)
      if (ps === undefined) return undefined
      current = ps.type
      continue
    }
    if (AST.isTupleType(inner) && typeof segment === 'number') {
      const rest = inner.rest[0]
      if (rest === undefined) return undefined
      current = rest.type
      continue
    }
    return undefined
  }
  return current
}

const valueAt = (value: unknown, path: Path.Path): unknown =>
  path.reduce<unknown>(
    (acc, s) => (acc === null || acc === undefined ? acc : (acc as Record<Path.Segment, unknown>)[s]),
    value,
  )

/**
 * Validates a form value against a schema.
 *
 * `{ errors: 'all' }` is required — Effect short-circuits on the first error by default,
 * which would light up a single field per form.
 *
 * @since 0.0.0
 * @category Constructors
 */
export const validate = <A, I, R>(schema: Schema.Schema<A, I, R>, value: unknown): Result<A> => {
  const decoded = Schema.decodeUnknownEither(schema as Schema.Schema<A, I, never>, {
    errors: 'all',
  })(value)
  return Either.match(decoded, {
    onLeft: error => ({
      isValid: false as const,
      issues: dedupe(overrideMessages(schema.ast, fromParseError(error), value)),
    }),
    onRight: v => ({ isValid: true as const, value: v }),
  })
}
