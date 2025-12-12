'use strict'

const requireIndex = require('requireindex')

// import all rules in lib/rules
module.exports.rules = requireIndex(__dirname + '/rules')

module.exports.configs = {
  recommended: {
    plugins: ['commander-option-flags'],
    rules: {
      'commander-option-flags/commander-option-flags': 'warn',
    },
  },
}
