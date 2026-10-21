// Counts supplement the workflow outcome. They never replace a failed setup,
// timeout or cancellation with an inferred passing check.
export function jestCounts(result) {
  if (!Number.isSafeInteger(result.numTotalTests) || result.numTotalTests <= 0)
    return null
  const counts = {
    passed: result.numPassedTests,
    failed: result.numFailedTests,
    skipped: (result.numPendingTests || 0) + (result.numTodoTests || 0),
    flaky: 0,
  }
  return Object.values(counts).every((n) => Number.isSafeInteger(n) && n >= 0)
    ? counts
    : null
}
export function playwrightCounts(result) {
  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 }
  function visit(suite) {
    for (const spec of suite.specs || [])
      for (const test of spec.tests || []) {
        // One final outcome per test/project, not one count per retry.
        const key = {
          expected: 'passed',
          unexpected: 'failed',
          skipped: 'skipped',
          flaky: 'flaky',
        }[test.status]
        if (key) counts[key]++
      }
    for (const child of suite.suites || []) visit(child)
  }
  visit(result)
  return Object.values(counts).some(Boolean) ? counts : null
}
