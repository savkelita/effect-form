# effect-form

Give it a `Schema.Struct` built out of **domain types** and it draws the fields.

The widget and the error messages sit **on the type**. A screen only picks which fields it
wants and how they are arranged.

- **No default look.** `Dom` is a type parameter — a template returns React nodes, strings,
  or whatever your UI is made of. The core imports nothing but `effect`.
- **No registry.** A template is a value stored on the schema, so a domain type works the
  moment it is defined.
- **No state.** The application holds the form value and decides when to validate.

> **Status: pre-alpha.** Drawing and validation work and are covered by tests. Lists and
> the form lifecycle are not there yet.

## Install

```sh
npm install effect-form effect
```

`effect` is a peer dependency (`~4.0.0`). The package is ESM only, like Effect 4, and needs
Node `^20.19.0 || >=22.12.0`.

## A domain type — defined once

```tsx
import { Schema } from 'effect'
import * as Annotation from 'effect-form/Annotation'
import type { Locals } from 'effect-form/Locals'
import type { ReactNode } from 'react'

/** The form value is wider than the validated one: the field may still be empty. */
export type Form = string | null

const textField = (l: Locals<Form>): ReactNode => (
  <label htmlFor={l.id}>
    {l.label}
    <input
      id={l.id}
      name={l.name}
      value={l.value ?? ''}
      disabled={l.disabled}
      onChange={e => l.onChange(e.target.value === '' ? null : e.target.value)}
    />
    {l.hasError && <span role="alert">{l.error}</span>}
  </label>
)

export const vForm = Schema.String.pipe(
  Schema.check(Schema.isMaxLength(80)),
  Annotation.label('Name'),
  Annotation.template(textField),
  Annotation.message((v: Form) => (v === null ? 'This field is required' : undefined)),
)
```

`Schema` is an immutable value, so every combinator returns a new schema — hence `pipe`.

## A screen — picks fields and layout

```tsx
import { Schema } from 'effect'
import * as Form from 'effect-form/Form'
import * as Validation from 'effect-form/Validation'
import * as Name from './domain/name'

export const { render } = Form.make<ReactNode>()

const vForm = Schema.Struct({
  name: Name.vForm,
  website: Schema.NullOr(Name.vForm),
})

type FormValue = {
  readonly name: Name.Form
  readonly website: Name.Form
}

const options: Form.FieldOptions<ReactNode, FormValue> = {
  template: l => (
    <>
      {l.inputs.name}
      {l.inputs.website}
    </>
  ),
  fields: { website: { label: 'Web address' } },
}

const view = (value: FormValue, issues: ReadonlyArray<Validation.Issue>) =>
  render({ schema: vForm, value, onChange: save, options, issues })
```

`fields` and `locals.inputs` are keyed by the form value, so a typo is a compile error.
A field's `onChange` gives back the **whole new form value**, so the application keeps one
value and no per-field state.

## Validation

```ts
const result = Validation.validate(vForm, value)

if (result.isValid) {
  submit(result.value) // decoded, typed as the schema's `A`
} else {
  show(result.issues) // [{ path: ['website'], message: 'This field is required' }]
}
```

Every invalid field is reported, not only the first. A domain type's own message overrides
the one Effect produced; returning `undefined` from it keeps Effect's text.

The library never validates on its own — the screen decides *when* issues are passed to
`render`, which is what makes "validate on submit" and "validate as you type" the same code.

## Fields that need more than a value

Anything past the known option keys reaches the template untouched and arrives typed
through `Locals<V, O>`:

```tsx
// the domain type declares what it needs
type ComboOptions = { readonly model: Combo.Model; readonly onMsg: (msg: Combo.Msg) => void }

const comboField = (l: Locals<Value | null, ComboOptions>): ReactNode => …

// the screen hands it over
fields: {
  municipality: { label: 'Municipality', model: model.combo, onMsg: msg => dispatch(comboMsg(msg)) },
}
```

That is how a widget with its own state and effects — a server-fed combo box, say — plugs
in without a line of support in the library.

## How the form finds a widget

An annotation stays where it was written and does not move onto a wrapper: with
`Schema.NullOr(Name)` it sits on the union member, with `Name.pipe(Schema.check(...))` on
the checks of `Name`. `TypeInfo.getTypeInfo` descends through checks, transformations,
suspends and nullable unions until it finds a template, remembering whether it passed
through a nullable — that is where `required` comes from.

Through a transformation the descent goes towards the **encoded** side — that is what the
form holds and what error paths refer to.

The template is the outermost one found. The other annotations resolve over the whole
chain, so a check can give the narrower rule its own message; `attrs` merge per key.

Whether a node is a **leaf** is decided by the domain type carrying a template. Everything
else that is a struct is a **container**, and a container must be given a layout through
`options.template`.

**The label deliberately does not go through `Schema.annotate({ title })`** — it has a key
of its own, so nothing Effect writes into a schema's annotations can overwrite it. Hence
`Annotation.label`.

## Modules

| module | what it does |
|---|---|
| `Annotation` | `template` / `message` / `label` / `attrs` and their getters |
| `Form` | `make<Dom>()` → `render(props)` |
| `Validation` | `validate` → the decoded value, or issues by path |
| `TypeInfo` | descent through the AST to the domain type |
| `Locals` | the contract the form hands to a template |
| `Path` | `equals`, `isPrefix`, `toId`, `toName`, `humanize` |

Each is also a subpath import: `effect-form/Form`, `effect-form/Validation`, and so on.

## Scripts

| script | what it does |
|---|---|
| `npm run typecheck` | `tsc` over `src/` and `tests/` |
| `npm test` | `vitest run` |
| `npm run build` | `tsup` (esm + dts) |
| `npm run check` | all three, in that order |

Tests do not check types — `typecheck` is separate and required. Type-level claims are
made with `@ts-expect-error` inside the test files, which fails when there is no error.

## License

MIT © Marko Savic
