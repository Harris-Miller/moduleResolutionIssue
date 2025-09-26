export * from './math';

export function append<T>(arr: T[], item: T) {
  return arr.concat(item);
}
