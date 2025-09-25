import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts', // Your main TypeScript entry file
  output: [{
    dir: 'dist',
    format: 'cjs',
    sourcemap: true,
    preserveModules: true,
    entryFileNames: '[name].cjs',
  }, {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
    preserveModules: true,
  }],
  plugins: [
    typescript({
      noForceEmit: true
    }),
  ],
  external: [
    // List any external dependencies that should not be bundled
    // For example, if you're building a library and expect users to provide React:
    // 'react',
    // 'react-dom'
  ],
};
