# Universal Visual Learning Engine

Plataforma de aprendizaje visual: la IA describe un conocimiento como **especificación** (JSON) y un **motor** común la interpreta y la ejecuta.

```
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # genera dist/index.html (archivo único)
```

- `engine/core` — formato de especificación (Zod), evaluador de expresiones, estado (Zustand)
- `engine/renderer-2d` — `UnitGrid`: cuadrícula de unidades (v0 en DOM/CSS; PixiJS llegará cuando haga falta)
- `knowledge-library/mathematics/square-roots/spec.json` — primera experiencia, 100 % datos
- `apps/web` — app React que carga una especificación y la ejecuta
- Carpetas vacías (`.gitkeep`): reservadas para 3D, física, dominios, `ai-builder` y `backend`

Una especificación es una línea de tiempo de *beats*: qué cuadritos se ven (`tiles`), qué medidas se marcan (`marks`), qué símbolo se muestra (`say`). Añadir un concepto nuevo = añadir un JSON, sin programar.

## IA constructora (etapa 5, v0)
`api/generate.ts` (Vercel) recibe `{concept}`, llama a la API de Groq con el prompt de `ai-builder/experience-generator`, valida el resultado con Zod + evaluador y lo devuelve al motor. Variable de entorno requerida: `GROQ_KEY` (opcional: `GROQ_MODEL`). En la app: ✨ → escribir un concepto → →.
Límite actual: el motor solo tiene el módulo de cuadrícula de unidades; conceptos fuera de ese módulo devuelven `unsupported`.
