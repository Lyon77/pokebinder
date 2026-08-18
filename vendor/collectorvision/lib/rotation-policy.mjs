// Pokebinder addition to CollectorVision (AGPL-3.0).
// Keep the adaptive rotation decision pure so it can be regression-tested
// without loading ONNX Runtime in Node.
export const DEFAULT_ROTATION_FAST_PATH_THRESHOLD = 0.75;

export function shouldCheckRotatedMatch(
  uprightScore,
  rotationInvariant = true,
  fastPathThreshold = DEFAULT_ROTATION_FAST_PATH_THRESHOLD,
) {
  if (!rotationInvariant) return false;
  const threshold = Number.isFinite(fastPathThreshold)
    ? Math.min(1, Math.max(0, fastPathThreshold))
    : DEFAULT_ROTATION_FAST_PATH_THRESHOLD;
  return !Number.isFinite(uprightScore) || uprightScore < threshold;
}
