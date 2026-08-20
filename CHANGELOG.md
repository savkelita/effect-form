# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[semantic versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, a minor bump may carry a breaking change.

## [Unreleased]

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

[unreleased]: https://github.com/savkelita/effect-form/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/savkelita/effect-form/releases/tag/v0.1.0
