import { add, append } from 'test-lib';

export function fibonacciIterative(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];

  let sequence: number[] = [0, 1];
  for (let i = 2; i < n; i++) {
    sequence = append(sequence, add(sequence[i - 1], sequence[i - 2]))
  }
  return sequence;
}
