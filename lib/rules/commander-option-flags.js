'use strict'

const parseFlags = (flags) => {
  // Remove arguments like <path> or [value]
  const cleanFlags = flags.replace(/[[<].*[\]>]/g, '').trim()
  const parts = cleanFlags.split(/[ ,|]+/).filter(Boolean)
  return parts
}

const getFlagName = (flag) => {
  return flag.replace(/^-+/, '')
}

const isShort = flag => /^-[a-zA-Z]$/.test(flag)
const isLong = flag => /^--[a-zA-Z0-9-]+$/.test(flag)

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce commander option flags style',
      category: 'Style',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          order: {
            enum: ['short', 'long'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidFormat:
                'Option flags must be "-[char], --[word]" or one of them.',
      invalidOrder:
                'Short flag must come before long flag: "{{ correct }}"',
      notSorted:
                'Options should be sorted alphabetically. "{{ current }}" should be before "{{ prev }}".',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode
    const configuration = context.options[0] || {}
    const order = configuration.order || 'long'

    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression'
          || node.callee.property.name !== 'option'
        ) {
          return
        }

        const args = node.arguments
        if (
          args.length === 0
          || args[0].type !== 'Literal'
          || typeof args[0].value !== 'string'
        ) {
          return
        }

        const flagsStr = args[0].value
        const rawParts = parseFlags(flagsStr)

        // Check 1 & 2: Format and Internal Order
        let shortFlag = null
        let longFlag = null
        let invalid = false

        for (const part of rawParts) {
          if (isShort(part)) {
            if (shortFlag) invalid = true // Duplicate short
            shortFlag = part
          }
          else if (isLong(part)) {
            if (longFlag) invalid = true // Duplicate long
            longFlag = part
          }
          else {
            invalid = true
          }
        }

        if (!shortFlag && !longFlag) invalid = true
        if (invalid || rawParts.length > 2) {
          context.report({
            node: args[0],
            messageId: 'invalidFormat',
          })
          return // Cannot proceed to sorting check if format is bad
        }

        // Check internal order: Short, Long
        if (shortFlag && longFlag) {
          let shortIndex = flagsStr.indexOf(shortFlag)
          // Avoid matching the substring of a long flag (e.g. -p inside --port)
          while (shortIndex > 0 && flagsStr[shortIndex - 1] === '-') {
            shortIndex = flagsStr.indexOf(
              shortFlag,
              shortIndex + 1,
            )
          }

          const longIndex = flagsStr.indexOf(longFlag)

          if (
            shortIndex !== -1
            && longIndex !== -1
            && shortIndex > longIndex
          ) {
            // Needs reordering
            // We assume standard format "-s, --long <arg>" or similar
            // We want to preserve whatever arg definition follows the flags
            // Find where the flags end.
            // The flagsStr is something like "--long, -s <arg>"
            // We want to make it "-s, --long <arg>"

            // Construct the new prefix
            const newPrefix = `${shortFlag}, ${longFlag}`

            // Remove the old flags from the string to get the suffix
            // This is a bit hacky, replacing the specific substrings
            let suffix = flagsStr
            suffix.replace(shortFlag, '').replace(longFlag, '')
            // Cleanup commas and spaces at the start of suffix is hard because they might have been between flags

            // Better approach: Regex match the whole structure
            // (flag1)(sep)(flag2)(rest)
            // But we don't know which came first easily without regex

            // Let's look for the position after the last flag
            const lastFlagEnd = Math.max(
              shortIndex + shortFlag.length,
              longIndex + longFlag.length,
            )
            const rest = flagsStr.slice(lastFlagEnd)

            const newFlagsStr = `${newPrefix}${rest}`

            context.report({
              node: args[0],
              messageId: 'invalidOrder',
              data: { correct: newFlagsStr },
              fix(fixer) {
                const quote = args[0].raw.charAt(0)
                return fixer.replaceText(
                  args[0],
                  `${quote}${newFlagsStr}${quote}`,
                )
              },
            })
          }
        }

        // Check 3: Sorting relative to previous .option()
        const parent = node.callee.object
        if (
          parent.type === 'CallExpression'
          && parent.callee.type === 'MemberExpression'
          && parent.callee.property.name === 'option'
        ) {
          const prevArgs = parent.arguments
          if (
            prevArgs.length > 0
            && prevArgs[0].type === 'Literal'
            && typeof prevArgs[0].value === 'string'
          ) {
            const prevFlagsStr = prevArgs[0].value
            const prevParts = parseFlags(prevFlagsStr)

            const getSortKey = (parts) => {
              const long = parts.find(p => isLong(p))
              const short = parts.find(p => isShort(p))

              if (order === 'short') {
                if (short)
                  return getFlagName(short).toLowerCase()
                if (long)
                  return getFlagName(long).toLowerCase()
              }
              else {
                if (long)
                  return getFlagName(long).toLowerCase()
                if (short)
                  return getFlagName(short).toLowerCase()
              }
              return null
            }

            const currentSortKey = getSortKey(rawParts)
            const prevSortKeyFound = getSortKey(prevParts)

            if (currentSortKey && prevSortKeyFound) {
              if (currentSortKey < prevSortKeyFound) {
                context.report({
                  node: node.callee.property, // Report on the '.option'
                  messageId: 'notSorted',
                  data: {
                    current: currentSortKey,
                    prev: prevSortKeyFound,
                  },
                  fix(fixer) {
                    const prevCall = parent
                    const currCall = node

                    const prevObject
                      = prevCall.callee.object
                    const startOfPrev = prevObject.range[1]
                    const endOfPrev = prevCall.range[1]
                    const startOfCurr = endOfPrev // assuming they are adjacent in code
                    const endOfCurr = currCall.range[1]

                    const segmentPrev
                      = sourceCode.text.slice(
                        startOfPrev,
                        endOfPrev,
                      )
                    const segmentCurr
                      = sourceCode.text.slice(
                        startOfCurr,
                        endOfCurr,
                      )

                    return [
                      fixer.replaceTextRange(
                        [startOfPrev, endOfPrev],
                        segmentCurr,
                      ),
                      fixer.replaceTextRange(
                        [startOfCurr, endOfCurr],
                        segmentPrev,
                      ),
                    ]
                  },
                })
              }
            }
          }
        }
      },
    }
  },
}
