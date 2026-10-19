# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[semantic versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, a minor bump may carry a breaking change.

## [0.2.0] - 2026-10-19

Requires Effect 4.0 (`effect` `~4.0.0`).

### Breaking

- `effect` peer dependency is `~4.0.0` (was `^3.19.15`), so the schemas passed in are
  Effect 4 schemas. TypeScript 5.9 or newer, as Effect 4 requires.
- ESM only, like Effect 4: `"type": "module"`, every `exports` entry is `{ types, default }`,
  and the CommonJS build and the `module` field are gone. `engines.node` is
  `^20.19.0 || >=22.12.0` (was `>=18.0.0`); `require('effect-form')` works only through
  Node's `require(esm)`.
- `Validation.fromParseError` takes Effect 4's `Schema.SchemaError`; Effect 4 has no
  `ParseError`. The `schema` of `Form.render` and `Validation.validate` is a `Schema.Codec`.

### Changed

- `Validation` — the messages Effect produces are Effect 4's wording, and a value that
  matches no member of a union is one issue, not one per member. A domain type's own
  message still overrides either.

## [0.1.0] - 2026-08-20

First public release.

### Added

- `Annotation` — `template`, `message`, `label`, `attrs` and their getters. A domain type
  carries its own widget and error message on the schema itself.
- `Form` — `make<Dom>()` returns `render(props)`. `Dom` is a type parameter, so a template
  may return whatever the application's UI is made of.
- `Validation` — `validate(schema, value)` returns either the decoded value or every issue,
  keyed by path, with the domain type's own messages applied over Effect's.
- `TypeInfo` — `getTypeInfo` descends through refinements, transformations, suspends and
  nullable unions to the domain type that carries the template, deriving `required` on the
  way.
- `Locals` — the contract a template receives, typed by the form value.
- `Path` — `equals`, `isPrefix`, `toId`, `toName`, `humanize`.

[0.2.0]: https://github.com/savkelita/effect-form/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/savkelita/effect-form/releases/tag/v0.1.0