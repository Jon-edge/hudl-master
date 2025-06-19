import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Convert the user's preferred ESLint rules to flat config format
const eslintConfig = [
  // Base Next.js configurations
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Add custom rules
  {
    rules: {
      // Make semicolons optional (from standard style)
      "semi": ["error", "never"],
      
      // TypeScript-specific rules from user preferences
      "@typescript-eslint/default-param-last": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/require-array-sort-compare": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        "allowNullableObject": false
      }],
      
      // React hooks rules
      "react-hooks/exhaustive-deps": ["error", {
        "additionalHooks": "^useSceneFooterRender$"
      }],
      "react/jsx-handler-names": "off",
    },
  },
  
  // Add specific rules for TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error"
    },
  },
];

export default eslintConfig;
