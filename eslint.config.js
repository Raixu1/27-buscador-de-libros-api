import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Reglas de calidad automáticas (también aplican al código escrito por la IA).
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "ia/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: "error",
      complexity: ["error", 12],
      "max-lines-per-function": ["error", { max: 70, skipComments: true }],
      "max-lines": ["error", { max: 250, skipComments: true }],
    },
  },
  { files: ["tests/**"], rules: { "max-lines-per-function": "off" } },
);
