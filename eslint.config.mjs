import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /*
    Lint COM TIPOS, ligado em 04/08/2026, antes da migração para banco.

    Motivo, e ele é concreto: quando o armazenamento virar assíncrono, esquecer
    um `await` em várias posições NÃO gera erro de compilação. `gravar(dados)`
    sozinho numa linha é uma expressão válida; `!promessa` é sempre `false` e
    satisfaz uma assinatura `: boolean`. O `tsc` não vê nada, e o resultado é a
    tela dizendo "salvo" enquanto a gravação ainda não terminou — ou nem
    aconteceu.

    `eslint-config-next` não liga regra com tipo, então até aqui o projeto não
    tinha NENHUMA ferramenta capaz de pegar isso. Estas duas regras são a única
    cobertura automática que existe para esse defeito.

    Custo: o lint passa a precisar do type-checker e fica mais lento. Vale.
  */
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.mts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // Promise criada e não aguardada nem tratada. É o defeito descrito acima.
      "@typescript-eslint/no-floating-promises": "error",
      // Promise usada onde se espera valor síncrono: condição de `if`, callback
      // que devolve void, atributo booleano de JSX.
      "@typescript-eslint/no-misused-promises": "error",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
