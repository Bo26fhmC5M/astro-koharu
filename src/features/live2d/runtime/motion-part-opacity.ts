export interface InitialPartOpacity {
  id: string;
  value: number;
}

/** Reads the initial part visibility authored into the model's idle motion. */
export function readInitialPartOpacities(motion: unknown): InitialPartOpacity[] {
  if (!motion || typeof motion !== 'object' || !('Curves' in motion) || !Array.isArray(motion.Curves)) return [];

  return motion.Curves.flatMap((curve): InitialPartOpacity[] => {
    if (!curve || typeof curve !== 'object') return [];
    if (!('Target' in curve) || curve.Target !== 'PartOpacity') return [];
    if (!('Id' in curve) || typeof curve.Id !== 'string') return [];
    if (!('Segments' in curve) || !Array.isArray(curve.Segments)) return [];
    const value = curve.Segments[1];
    return typeof value === 'number' && Number.isFinite(value) ? [{ id: curve.Id, value }] : [];
  });
}
