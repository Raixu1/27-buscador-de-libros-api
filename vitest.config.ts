import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      // Lógica de negocio: rutas y librerías del servidor.
      include: ["src/lib/**", "src/app/api/**"],
      // firebase.ts solo inicializa el Admin SDK con credenciales reales: se prueba en producción, no en CI.
      exclude: ["src/lib/firebase.ts"],
      // Bajar de aquí rompe `npm run check`.
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
