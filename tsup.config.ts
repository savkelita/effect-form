import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/Annotation.ts',
    'src/Form.ts',
    'src/Locals.ts',
    'src/Path.ts',
    'src/TypeInfo.ts',
    'src/Validation.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['effect'],
})
