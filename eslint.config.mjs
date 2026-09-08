import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma's generated client legitimately references the raw-query APIs.
    "lib/generated/**",
  ]),
  {
    rules: {
      // SQL-injection guard: every query in this app goes through Prisma's query builder or its
      // parameterized tagged-template ($queryRaw / $executeRaw). The *Unsafe variants take a
      // plain string and are the one way to reintroduce injection — ban them outright.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^\\$(queryRawUnsafe|executeRawUnsafe)$/]",
          message:
            "Unparameterized raw SQL is not allowed. Use Prisma's query builder, or $queryRaw`...` / $executeRaw`...` with interpolation (which parameterizes).",
        },
      ],
    },
  },
]);

export default eslintConfig;
