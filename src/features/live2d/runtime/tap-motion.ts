export function findTapMotionGroup(
  hitAreas: readonly string[],
  hasMotionGroup: (group: string) => boolean,
): string | undefined {
  return hitAreas.map((name) => `Tap${name}`).find(hasMotionGroup);
}
