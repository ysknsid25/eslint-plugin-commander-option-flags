# eslint-plugin-commander-option-flags

An ESLint plugin to enforce standard style for [Commander.js](https://github.com/tj/commander.js) option flags.

## Features

- **Format Check**: Ensures flags are in the format `-[char], --[word]` (or just one of them).
- **Internal Order**: Enforces short flags to come before long flags (e.g., `-p, --port` instead of `--port, -p`).
- **Alphabetical Sorting**: Enforces chained `.option()` calls to be sorted alphabetically by flag name.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```bash
npm i eslint --save-dev
```

Next, install `eslint-plugin-commander-option-flags`:

```bash
npm install eslint-plugin-commander-option-flags --save-dev
```

## Usage

Add `commander-option-flags` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "commander-option-flags"
    ],
    "rules": {
        "commander-option-flags/commander-option-flags": "warn"
    }
}
```

## Rule Details

### Options

The rule accepts an optional object to configure the sorting order:

*   `order`: `"long"` (default) or `"short"`. Determines whether to sort based on the long flag name or the short flag name.

```json
"commander-option-flags/commander-option-flags": ["warn", { "order": "long" }]
```

### Examples

**👎 Incorrect**

```javascript
program
  .option('--banana, -b') // Invalid order within string
  .option('-a, --apple') // Not sorted relative to previous
  .option('--port, -p <number>') // Long flag before short flag
  .option('port <number>') // Missing hyphens
  .option('-a, -b, --c') // Too many parts
  .option('-x, -x') // Duplicate short flags
  .option('--verbose, --verbose') // Duplicate long flags
```

**👍 Correct**

```javascript
program
  .option('-a, --apple')
  .option('-b, --banana')
  .option('-p, --port <number>')
  .option('-s', 'short only')
  .option('--long', 'long only')
```

## Implementation Details

The core logic is located in `lib/rules/commander-option-flags.js`. Here is a high-level overview of how it works:

1.  **AST Traversal**: The rule listens for `CallExpression` nodes to identify calls to `.option()`. It specifically checks if the callee is a `MemberExpression` with the property name `option`.
2.  **Flag Parsing**: It extracts the first argument (the flags string, e.g., `"-p, --port <number>"`) and cleans it by removing argument placeholders (like `<path>` or `[value]`). The remaining string is split to identify potential short (`-s`) and long (`--long`) flags.
3.  **Validation Phases**:
    *   **Format Check**: Verifies that the flags strictly match the `-[char]` or `--[word]` patterns and ensures no duplicates exist.
    *   **Internal Order Check**: Checks if both short and long flags are present. If so, it verifies that the short flag appears *before* the long flag in the string.
    *   **Sorting Check**: It inspects the *parent* object to find the preceding chained call. If the previous call was also an `.option()`, it compares their flag names alphabetically (based on the `order` configuration).
4.  **Autofix Mechanism**:
    *   **Internal Reordering**: Reconstructs the flag string with the short flag first, preserving any trailing arguments.
    *   **Sorting**: Uses `fixer.replaceTextRange` to swap the entire code range of the current `.option(...)` call with the preceding one.

## TypeScript Support

This plugin works with TypeScript files parsed by `@typescript-eslint/parser`.

## License

MIT
