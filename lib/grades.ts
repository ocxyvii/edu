export function computeGrade(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 65) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'F'
}
