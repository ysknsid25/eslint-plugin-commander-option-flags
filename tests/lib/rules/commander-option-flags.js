'use strict'

const rule = require('../../../lib/rules/commander-option-flags')
const { RuleTester } = require('eslint')

const ruleTester = new RuleTester()

ruleTester.run('commander-option-flags', rule, {
  valid: [
    // Standard correct usage
    'program.option(\'-p, --port <number>\', \'port number\')',

    // Sorted correctly
    `program
      .option('-a, --apple', 'apple desc')
      .option('-b, --banana', 'banana desc')`,

    // Single flags
    'program.option(\'-s\', \'short only\')',
    'program.option(\'--long\', \'long only\')',

    // TypeScript usage (using TS parser if configured, but here just checking syntax compat)
    {
      code: 'const program: Command = new Command(); program.option(\'-a, --apple\', \'apple\');',
      languageOptions: { parser: require('@typescript-eslint/parser') },
    },
  ],

  invalid: [
    // Invalid Order (Long before Short)
    {
      code: 'program.option(\'--port, -p <number>\', \'port number\')',
      output: 'program.option(\'-p, --port <number>\', \'port number\')',
      errors: [{ messageId: 'invalidOrder' }],
    },
    // Not Sorted
    {
      code: `program
        .option('-b, --banana', 'banana desc')
        .option('-a, --apple', 'apple desc')`,
      output: `program
        .option('-a, --apple', 'apple desc')
        .option('-b, --banana', 'banana desc')`,
      errors: [{ messageId: 'notSorted' }],
    },
    // Invalid Format (no valid flags)
    {
      code: 'program.option(\'invalid\', \'desc\')',
      errors: [{ messageId: 'invalidFormat' }],
    },
    // Invalid Format (missing hyphens)
    {
      code: 'program.option(\'port <number>\', \'desc\')',
      errors: [{ messageId: 'invalidFormat' }],
    },
    // Invalid Format (too many parts)
    {
      code: 'program.option(\'-a, -b, --c\', \'desc\')',
      errors: [{ messageId: 'invalidFormat' }],
    },
    // Invalid Format (duplicate short flags)
    {
      code: 'program.option(\'-x, -x\', \'desc\')',
      errors: [{ messageId: 'invalidFormat' }],
    },
    // Invalid Format (duplicate long flags)
    {
      code: 'program.option(\'--verbose, --verbose\', \'desc\')',
      errors: [{ messageId: 'invalidFormat' }],
    },
  ],
})
