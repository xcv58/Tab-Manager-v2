import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jest from "eslint-plugin-jest";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jest/recommended",
    "prettier",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        jest,
    },

    languageOptions: {
        globals: {
            page: true,
            browser: true,
            context: true,
            jestPuppeteer: true,
            __dirname: true,
            require: true,
            module: true,
            process: true,
            Buffer: true,
        },

        parser: tsParser,
    },

    rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "jest/no-disabled-tests": "off",
        "jest/no-jest-import": "off",

        "@typescript-eslint/no-unused-vars": [2, {
            argsIgnorePattern: "^_",
        }],
    },
}, {
    files: ["**/*.js", "webpack.config.js", "**/utils/**/*.js"],
    rules: {
        "@typescript-eslint/no-require-imports": "off",
        "no-undef": "off",
    },
    languageOptions: {
        globals: {
            console: true,
        }
    }
}, {
    ignores: ["packages/extension/safari/"]
}];