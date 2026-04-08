export function computeRetryDelayMs(attempt: number): number {
  return 10_000 * 2 ** attempt;
}
