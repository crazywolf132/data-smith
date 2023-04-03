import { defineConfig } from 'tsup';
import { name } from './package.json';

export default defineConfig({
    name,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
});