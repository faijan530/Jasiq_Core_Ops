export function moneyVo({ amount, currency }) {
  return { amount: Number(amount || 0), currency: String(currency || 'INR') };
}
