import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // director/ e aplicație separată, cu propriul eslint/tsconfig
  globalIgnores([".next/**", "node_modules/**", "out/**", "director/**"]),
]);
