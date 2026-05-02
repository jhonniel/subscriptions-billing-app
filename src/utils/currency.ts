const numberFmt = (fractionDigits: 0 | 2) =>
  new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

/** Philippine peso — always prefixed with ₱; digits use en-PH grouping. */
export function formatMoney(amount: number, fractionDigits: 0 | 2 = 2): string {
  return `₱${numberFmt(fractionDigits).format(amount)}`
}
