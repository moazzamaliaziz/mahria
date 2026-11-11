export function formatPrice(paisa: number) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: paisa % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paisa / 100)}`;
}
