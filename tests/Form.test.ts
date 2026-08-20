import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Annotation from '../src/Annotation'
import * as Form from '../src/Form'
import type { Locals, StructLocals, StructTemplate } from '../src/Locals'
import * as Validation from '../src/Validation'

// =====================================================================================
// Application side: domain types, defined once. `Dom` is a string so the test reads
// without React.
// =====================================================================================

/** Records every field's onChange so a test can call it. */
const handlers = new Map<string, (v: never) => void>()

const text =
  <A,>(kind: string) =>
  (l: Locals<A>): string => {
    handlers.set(l.name, l.onChange as (v: never) => void)
    const parts = [
      kind,
      `name=${l.name}`,
      `label=${JSON.stringify(l.label)}`,
      l.required ? 'required' : 'optional',
      `value=${JSON.stringify(l.value)}`,
      ...(l.hasError ? [`error=${JSON.stringify(l.error)}`] : []),
      ...(l.disabled ? ['disabled'] : []),
    ]
    return `[${parts.join(' ')}]`
  }

const Name = Schema.String.pipe(
  Schema.maxLength(80),
  Annotation.template(text<string | null>('Text')),
  Annotation.message((v: string | null) => (v === null ? 'This field is required' : undefined)),
)

const Int = Schema.Number.pipe(Schema.int(), Annotation.template(text<number | null>('SpinButton')))

/** A domain type carrying its own default label, non-ASCII included. */
const TaxId = Schema.String.pipe(
  Schema.pattern(/^\d{9}$/),
  Annotation.label('Tax ID №'),
  Annotation.template(text<string | null>('Text')),
)

// A domain type the screen sends extra options to — a combo.
interface ComboOptions {
  readonly model: string
  readonly onChangeCombo: (msg: string) => void
}
const MunicipalityValue = Schema.Struct({ id: Schema.Number, name: Schema.String })
type MunicipalityValue = typeof MunicipalityValue.Type

const Municipality = MunicipalityValue.pipe(
  Annotation.template((l: Locals<MunicipalityValue, ComboOptions>) => {
    l.onChangeCombo('filter')
    return `[Combo name=${l.name} model=${l.model} value=${JSON.stringify(l.value)}]`
  }),
  Annotation.message(() => 'Pick a municipality'),
)

const { render } = Form.make<string>()

/** The layout is the SCREEN's — the library has no default look. */
const layout =
  <V,>(...keys: ReadonlyArray<keyof V & string>) =>
  (l: StructLocals<string, V>): string =>
    `<form>${keys.map(k => l.inputs[k]).join('')}</>`

// =====================================================================================
// Screen side: picks fields and labels. No widget, no schema, no message.
// =====================================================================================

const vForm = Schema.Struct({
  name: Name,
  website: Schema.NullOr(Name),
  email: Name.pipe(Schema.filter(s => (s.includes('@') ? undefined : 'not an email'))),
  stateShare: Int,
  municipality: Municipality,
})

/** The form value is wider than `vForm.Type` — fields may be empty. */
type FormValue = {
  readonly name: string | null
  readonly website: string | null
  readonly email: string | null
  readonly stateShare: number | null
  readonly municipality: MunicipalityValue | null
}

const value: FormValue = {
  name: 'Acme',
  website: null,
  email: 'a@b.com',
  stateShare: 51,
  municipality: { id: 1, name: 'Downtown' },
}

const comboMsgs: Array<string> = []
const options: Form.FieldOptions<string, FormValue> = {
  template: layout('name', 'website', 'email', 'stateShare', 'municipality'),
  fields: {
    stateShare: { label: 'State share (%)' },
    municipality: {
      label: 'Municipality',
      model: 'combo-model',
      onChangeCombo: (msg: string) => comboMsgs.push(msg),
    },
  },
}

// Compile-time assertions. `@ts-expect-error` fails when there is NO error, so each of
// these is a real claim about the types.
export const _typedFields: Form.FieldOptions<string, FormValue> = {
  template: l => `${l.inputs.name}${l.inputs.municipality}`,
  fields: {
    // @ts-expect-error no field named "namee"
    namee: { label: 'x' },
  },
}

export const _typedInputs: StructTemplate<string, FormValue> = l =>
  // @ts-expect-error no child named "namee"
  l.inputs.namee

/** Untyped options must still nest at every depth. */
export const _untypedNesting: Form.FieldOptions<string> = {
  fields: { address: { fields: { street: { label: 'x' } } } },
}

const draw = (
  v: FormValue = value,
  extra?: { readonly ctx?: Partial<Form.Ctx>; readonly issues?: ReadonlyArray<Validation.Issue> },
) => {
  handlers.clear()
  return render({ schema: vForm, value: v, onChange: () => {}, options, ...extra })
}

describe('Form', () => {
  describe('drawing from the schema', () => {
    it('finds the template on the domain type', () => {
      expect(draw()).toContain('[Text name=name label="Name" required value="Acme"]')
    })

    it('finds the template through NullOr, and knows the field is not required', () => {
      expect(draw()).toContain('[Text name=website label="Website" optional value=null]')
    })

    it('finds the template through filter', () => {
      expect(draw()).toContain('[Text name=email label="Email" required value="a@b.com"]')
    })

    it('prefers the label from options over the derived one', () => {
      expect(draw()).toContain('label="State share (%)"')
    })

    it('draws a different widget for a different domain type', () => {
      expect(draw()).toContain('[SpinButton name=stateShare')
    })

    // Schema.maxLength/pattern write the constraint description into `title`, so the label
    // needs a key of its own — otherwise this would read "pattern(...)".
    it('uses the domain type default label', () => {
      const s = Schema.Struct({ taxId: TaxId })
      const out = render({
        schema: s,
        value: { taxId: '123456789' },
        onChange: () => {},
        options: { template: layout('taxId') },
      })
      expect(out).toContain('label="Tax ID №"')
    })

    it('passes the whole tree through the struct template', () => {
      expect(draw().startsWith('<form>')).toBe(true)
      expect(draw().endsWith('</>')).toBe(true)
    })
  })

  describe('descent to the domain type', () => {
    // The form holds the ENCODED value, so the descent goes towards `from`.
    const Price = Schema.transform(
      Schema.String.pipe(Annotation.template(text<string | null>('Text'))),
      Schema.Number,
      { strict: true, decode: (s: string) => Number(s), encode: (n: number) => String(n) },
    )

    it('finds the template through a transformation', () => {
      const out = render({
        schema: Schema.Struct({ price: Price }),
        value: { price: '199' },
        onChange: () => {},
        options: { template: layout<{ price: string | null }>('price') },
      })
      expect(out).toContain('[Text name=price label="Price" required value="199"]')
    })

    it('decodes the encoded form value', () => {
      const r = Validation.validate(Schema.Struct({ price: Price }), { price: '199' })
      expect(r.isValid).toBe(true)
      if (r.isValid) expect(r.value.price).toBe(199)
    })

    it('lets the outermost message win, so a filter can narrow the rule', () => {
      const Email = Schema.String.pipe(
        Annotation.template(text<string | null>('Text')),
        Annotation.message(() => 'from the domain type'),
      )
      const WorkEmail = Email.pipe(
        Schema.filter(s => (s.includes('@') ? undefined : 'not an email')),
        Annotation.message(() => 'from the narrower rule'),
      )
      const r = Validation.validate(Schema.Struct({ email: WorkEmail }), { email: 'abc' })
      if (r.isValid) throw new Error('expected a failure')
      expect(r.issues[0]?.message).toBe('from the narrower rule')
    })

    // The form holds the ENCODED value, so a text widget belongs on a schema that
    // validates to a number.
    it('takes a template typed by the encoded side', () => {
      const Quantity = Schema.transform(
        Schema.Trim.pipe(Schema.nonEmptyString(), Schema.pattern(/^-?\d+$/)),
        Schema.Number,
        { strict: true, decode: (s: string) => Number(s), encode: (n: number) => String(n) },
      ).pipe(
        Annotation.template(text<string | null>('Text')),
        Annotation.message((v: string | null) => (v === null ? 'This field is required' : undefined)),
      )

      const out = render({
        schema: Schema.Struct({ quantity: Quantity }),
        value: { quantity: '42' },
        onChange: () => {},
        options: { template: layout<{ quantity: string | null }>('quantity') },
      })
      expect(out).toContain('[Text name=quantity label="Quantity" required value="42"]')

      const ok = Validation.validate(Schema.Struct({ quantity: Quantity }), { quantity: '42' })
      expect(ok.isValid).toBe(true)
      if (ok.isValid) expect(ok.value.quantity).toBe(42)

      const bad = Validation.validate(Schema.Struct({ quantity: Quantity }), { quantity: null })
      if (bad.isValid) throw new Error('expected a failure')
      expect(bad.issues).toEqual([{ path: ['quantity'], message: 'This field is required' }])
    })

    it('reports a literal union once, not once per literal', () => {
      const Role = Schema.Literal('admin', 'editor', 'user').pipe(
        Annotation.template(text<string | null>('Select')),
        Annotation.message((v: string | null) => (v === null ? 'This field is required' : undefined)),
      )
      const r = Validation.validate(Schema.Struct({ role: Role }), { role: null })
      if (r.isValid) throw new Error('expected a failure')
      expect(r.issues).toEqual([{ path: ['role'], message: 'This field is required' }])
    })

    it('keeps different messages on the same path', () => {
      const r = Validation.validate(Schema.Struct({ x: Schema.Union(Schema.Number, Schema.Boolean) }), {
        x: 'a',
      })
      if (r.isValid) throw new Error('expected a failure')
      expect(r.issues.map(i => i.path)).toEqual([['x'], ['x']])
      expect(new Set(r.issues.map(i => i.message)).size).toBe(2)
    })

    it('merges attrs along the chain, outermost per key', () => {
      const withAttrs = (l: Locals<string | null>): string => JSON.stringify(l.attrs)
      const Base = Schema.String.pipe(
        Annotation.template(withAttrs),
        Annotation.attrs({ type: 'text', maxLength: 10 }),
      )
      const out = render({
        schema: Schema.Struct({ x: Schema.NullOr(Base).pipe(Annotation.attrs({ maxLength: 20 })) }),
        value: { x: null },
        onChange: () => {},
        options: { template: layout<{ x: string | null }>('x') },
      })
      expect(out).toContain('{"type":"text","maxLength":20}')
    })
  })

  describe('options the screen sends to a field', () => {
    it('passes unknown keys to the template untouched', () => {
      comboMsgs.length = 0
      expect(draw()).toContain('[Combo name=municipality model=combo-model')
      expect(comboMsgs).toEqual(['filter'])
    })

    // The layout belongs entirely to the screen: which field goes where, and whether it is
    // drawn at all.
    it('lets the screen order fields, and omit one', () => {
      const out = render({
        schema: vForm,
        value,
        onChange: () => {},
        options: { ...options, template: layout<FormValue>('stateShare', 'name') },
      })
      expect(out).toBe(
        '<form>[SpinButton name=stateShare label="State share (%)" required value=51]' +
          '[Text name=name label="Name" required value="Acme"]</>',
      )
    })

    it('fails with a clear message when a container has no layout', () => {
      expect(() => render({ schema: Schema.Struct({ name: Name }), value, onChange: () => {} })).toThrow(
        /no template/,
      )
    })

    it('reports the missing layout before walking the children', () => {
      expect(() =>
        render({ schema: Schema.Struct({ x: Schema.String }), value: { x: 'a' }, onChange: () => {} }),
      ).toThrow(/\(Struct\)/)
    })

    it('inherits disabled from the form down to every field', () => {
      const out = draw(value, { ctx: { disabled: true } })
      expect(out.match(/disabled/g)?.length).toBe(4) // the combo template does not print it
    })
  })

  describe('onChange', () => {
    it('gives back the WHOLE new form value', () => {
      let received: unknown
      render({ schema: vForm, value, onChange: v => (received = v), options })
      handlers.get('name')!('New name' as never)
      expect(received).toEqual({ ...value, name: 'New name' })
    })
  })

  describe('validation', () => {
    const empty: FormValue = {
      name: null,
      website: null,
      email: null,
      stateShare: null,
      municipality: null,
    }

    it('reports every invalid field, not just the first', () => {
      const r = Validation.validate(vForm, empty)
      expect(r.isValid).toBe(false)
      if (!r.isValid) {
        expect(r.issues.map(i => i.path)).toEqual([['name'], ['email'], ['stateShare'], ['municipality']])
      }
    })

    it('lets the domain type message override the one Effect produced', () => {
      const r = Validation.validate(vForm, empty)
      if (!r.isValid) {
        expect(r.issues.find(i => i.path[0] === 'name')?.message).toBe('This field is required')
        expect(r.issues.find(i => i.path[0] === 'municipality')?.message).toBe('Pick a municipality')
      }
    })

    it('passes a valid value through', () => {
      const r = Validation.validate(vForm, value)
      expect(r.isValid).toBe(true)
      if (r.isValid) expect(r.value.name).toBe('Acme')
    })

    it('draws each error on its own field', () => {
      const r = Validation.validate(vForm, empty)
      if (r.isValid) throw new Error('expected a failure')
      const out = render({ schema: vForm, value: empty, onChange: () => {}, options, issues: r.issues })
      expect(out).toContain('[Text name=name label="Name" required value=null error="This field is required"]')
      // website is optional -> no error
      expect(out).toContain('[Text name=website label="Website" optional value=null]')
    })
  })
})
