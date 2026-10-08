/** "½", "1", "1½", "2". Quantities are shown exactly as the user entered them. */
export function formatQuantity(q: number): string {
  if (q === 0.5) return '½';
  if (Number.isInteger(q)) return String(q);
  if (q % 1 === 0.5) return `${Math.floor(q)}½`;
  return String(q);
}
