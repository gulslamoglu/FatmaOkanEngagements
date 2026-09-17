export type CoverPosition = { x: number; y: number };
export function coverPosition(value?: Partial<CoverPosition> | null): CoverPosition {
  const clamp = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
  return { x: clamp(value?.x), y: clamp(value?.y) };
}
export function coverStyle(value?: Partial<CoverPosition> | null) {
  const {x,y} = coverPosition(value);
  return { objectPosition: x + '% ' + y + '%' };
}
