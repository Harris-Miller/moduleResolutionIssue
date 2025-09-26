# Typescript fails to resolve typedefs of type: module dependencies if app is using "moduleResolution": "nodenext"

This repo shows under minimal circumstances that a package configured with `"moduleResolution": "nodenext"` does not correct resolve typedefs deeply in dependency declaration files when those dependencies have are configured with `package.json#type="module"`

## The Repo

### `lib` folder

A standard js lib, written in typescript, transpiled to both commonjs and modules.

- package.json configured with `"type": "module"`
- tsconfig.json configured with `"module": "preserve"` and `"moduleResolution": "bundler"`
- built with rollup to `dist` folder
  - esm files are `.js`, cjs are `.cjs`, includes `.d.ts` files
- package.json has `"exports"` configure as so:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  }
}
```

### `app` folder

Standard NodeJS app, written in typescript, built only to commonjs which it runs

- package.json is (by default) configured with `"type": "commonjs"`
- The lib folder is a relative dependency via `"file://../lib"`
- tsconfig.json configured with `"module": "nodenext"`, and `"moduleResolution": "nodenext"`
- build with `tsc --outdir "dist"`. target commonjs, file extensions are `.js`
- run with `node ./dist/index.js`

## Reproducing the error

- in `lib`: `npm i && `npm run build`
- in `app`: `npm i`
- then, `npm run build`, typescript error
```
Module '"test-lib"' has no exported member 'add'.
```

## The Problem

The error is in the typechecker, node correctly resolves at runtime
- in `app/src/fib.ts`, add a `// @ts-expect-error` over the error
- run `npm run build` again, success
- `npm run start` works as expected

## Inspection
- Remove the `// @ts-expect-error`, notice the error is only the `add` function and not the `append` function
- if you look in lib, `append` is defined in `src/index.ts` while `add` in src/math.ts`
- `src/index.ts` re-exports `add`
- As shown above, `lib/package.json` has exports configured with `"types": "./dist/index.d.ts"`
  - notice it's a full path with file extension
- Inspect `/lib/dist/index.js`, notice `export { add } from './math.js';` has file extension
- Inspect `/lib/dist/index.cjs`, notice `var math = require('./math.cjs');` has file extension
  - Note: `rollup` always adds file extension by default
- Inspect `lib/dist/index.d.ts`, notice `export * from './math';` has no file extension
  - `tsc` _never_ adds file extensions to import statements in declaration file
  - This will be important for later

---

- Looking at `app/tsconfig.json` we have `"moduleResolution": "nodenext"`
  - if `app` were configured to be `"type": "module"`, import statements would require file extensions
- Notice in `src/main.ts` that `import { fibonacciIterative } from './fib';` has no file extension
  - ok because `"type": "commonjs"`
- `app/package.json` is `"type": "commonjs"`, but `lib/package.json` is `"type": "module"`
  - `append` is defined in `libs/dist/index.d.ts`, which is resolved through `package.json` pointing direct to file
  - `add` is re-exported, and without an extension, typescript in `app` can't resolve it because `"moduleResolution": "nodenext"`
- Proof: manually update `libs/dist/index.d.ts` to:
```typescript
export * from './math.d.ts';
```
- in `app`, do `npm run build`, success!
  - adding the extension satisfied `"moduleResolution": "nodenext"` requirement for file extensions when `"type": "module"`, even though it is the _dependency_ that is `"type": "module"`, and not it self

## Conclusion

This is a bug. There cannot exist a case where typescript fails to follow declaration import paths because they lack extensions.
`tsc` does not offer a way to write declaration files to include extensions

### There are not alternatives without significant drawbacks
- `"moduleResolution": "nodenext"` specifically is the problem in conjunction with a dependency of `"type": "module"`
  - If I remove `"type": "module"` from `lib`, everything works as expected, but that isn't an option if I don't own that dependency code
- Updating `app` to be `"types": "modules"` does not remove the typecheck error
- Changing to `"moduleResolution": "bundler"` removes the typechecking error, however a cannot target `"module": "commonjs"`
  - Updating to `"module": "esnext"` together with `"types": "modules"` works, however that may not be an option for legacy NodeJS apps
  - Or I could `"module": "preserve"` and switch to `rollup` to build to CJS for my runtime, but I shouldn't have too
- Changing to `"moduleResolution": "node10"` let's me target `"module": "commonjs"`, but Typescript-6.0 is deprecating `node10` and removing in 7.0 ([ref](https://github.com/microsoft/TypeScript/issues/62200)), and so is a bad option


