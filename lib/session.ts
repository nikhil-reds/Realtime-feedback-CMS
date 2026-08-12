/**
 * Generates a clean 6-character uppercase alphanumeric public ID
 * Excludes ambiguous characters (0, O, 1, I, L) for reliable reading & typing.
 */
export function generatePublicId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculates satisfaction percentage given up and down vote counts.
 */
export function calculateSatisfaction(upVotes: number, downVotes: number): number {
  const total = upVotes + downVotes;
  if (total === 0) return 0;
  return Math.round((upVotes / total) * 100);
}
