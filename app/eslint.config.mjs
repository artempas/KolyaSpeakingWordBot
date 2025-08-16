import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(['**/node_modules', '**/*.js', '**/*.d.ts']), {
    extends: compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
    plugins: {
        '@typescript-eslint': typescriptEslint,
        'unused-imports': unusedImports,
    },

    linterOptions: {
        reportUnusedDisableDirectives: true,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: tsParser,
        ecmaVersion: 12,
        sourceType: 'module',
    },

    rules: {
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                'args': 'all',
                'argsIgnorePattern': '^_',
                'caughtErrors': 'all',
                'caughtErrorsIgnorePattern': '^_',
                'destructuredArrayIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'ignoreRestSiblings': true
            }
        ],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        'array-bracket-newline': ['warn', 'consistent'],
        'array-element-newline': ['error', 'consistent'],

        'arrow-spacing': ['warn', {
            before: true,
            after: true,
        }],

        'block-spacing': ['warn', 'always'],

        'brace-style': ['warn', '1tbs', {
            allowSingleLine: true,
        }],

        'comma-spacing': ['error', {
            before: false,
            after: true,
        }],

        'computed-property-spacing': ['warn', 'never'],
        'function-call-argument-newline': ['error', 'consistent'],
        'func-call-spacing': ['error', 'never'],
        'function-paren-newline': ['error', 'consistent'],

        indent: ['error', 4, {
            ignoredNodes: ['PropertyDefinition'],
        }],

        'key-spacing': ['warn', {
            beforeColon: false,
            afterColon: true,
            mode: 'strict',
        }],

        'keyword-spacing': ['error', {
            before: true,
            after: true,
        }],

        'lines-between-class-members': ['warn', 'always'],

        'max-len': ['warn', {
            code: 150,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
        }],

        'max-statements-per-line': ['error', {
            max: 2,
        }],

        'no-extra-semi': 'warn',
        'no-multi-spaces': 'warn',

        'no-multiple-empty-lines': ['warn', {
            max: 2,
        }],

        'no-prototype-builtins': 'off',
        'unused-imports/no-unused-imports': 'error',
        'no-whitespace-before-property': 'error',
        'no-trailing-spaces': 'warn',

        'object-curly-newline': ['error', {
            consistent: true,
        }],

        'object-property-newline': ['error', {
            allowAllPropertiesOnSameLine: true,
        }],

        'prefer-const': 'off',
        quotes: ['error', 'single'],
        'space-infix-ops': ['error', {}],
        semi: ['warn', 'always'],

        'semi-spacing': ['error', {
            before: false,
            after: true,
        }],

        'semi-style': ['error', 'last'],
        'space-before-function-paren': 'off',

        'switch-colon-spacing': ['error', {
            after: true,
            before: false,
        }],
    },
}]);