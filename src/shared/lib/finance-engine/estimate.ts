/**
 * @returns `null` если срок нельзя оценить.
 */
export function estimatePayoffMonths(currentDebt: number, comfortablePayment: number): number | null {
  if (!(currentDebt > 0) || !(comfortablePayment > 0)) return null;
  return Math.ceil(currentDebt / comfortablePayment);
}
