/**
 * Image rotation utility for comic photos
 * Applies CSS transform based on stored rotation value
 */

export const getRotationTransform = (rotation: number | null | undefined): string => {
  if (!rotation || rotation === 0) return '';
  return `rotate(${rotation}deg)`;
};

export const normalizeRotation = (rotation: number): number => {
  // Normalize to 0, 90, 180, or 270
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const rotateLeft = (currentRotation: number | null | undefined): number => {
  const current = currentRotation || 0;
  const newRotation = current - 90;
  return normalizeRotation(newRotation);
};

export const rotateRight = (currentRotation: number | null | undefined): number => {
  const current = currentRotation || 0;
  const newRotation = current + 90;
  return normalizeRotation(newRotation);
};
