/**
 * Shared permutation and combination utilities.
 * Used by useBetCalculations, useBetResults, useBBCampuran, PolaColok, etc.
 */

/**
 * Generates all permutations of length r from an array (without repetition).
 * @param arr - Source array of elements
 * @param r - Length of each permutation
 * @returns Array of permutation arrays
 */
export function generatePermutations<T>(arr: T[], r: number): T[][] {
  if (r === 1) return arr.map((item) => [item]);

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    if (current === undefined) continue;

    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generatePermutations(rest, r - 1);

    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

/**
 * Gets unique digits from a number string.
 * @param numStr - The number string (e.g. "1234")
 * @returns Array of unique digit characters
 */
export function getUniqueDigits(numStr: string): string[] {
  return Array.from(new Set(numStr.split("")));
}

/**
 * Generates all combinations of k elements from an array (without repetition).
 * @param arr - Source array of elements
 * @param k - Size of each combination
 * @returns Array of combination arrays
 */
export function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  const backtrack = (start: number, current: T[]) => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]!);
      backtrack(i + 1, current);
      current.pop();
    }
  };

  backtrack(0, []);
  return result;
}
