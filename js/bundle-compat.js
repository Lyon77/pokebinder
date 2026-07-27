const READABLE_BUNDLE_VERSIONS = new Set([2, 3]);

function parseReadableBundleJson(value) {
  if (typeof value !== 'string') return null;

  let bundle;
  try {
    bundle = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !bundle
    || typeof bundle !== 'object'
    || Array.isArray(bundle)
    || !READABLE_BUNDLE_VERSIONS.has(bundle.v)
    || !Array.isArray(bundle.collections)
  ) {
    return null;
  }
  return bundle;
}

function jsonValuesEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => jsonValuesEqual(value, right[index]));
  }

  if (typeof left !== 'object') return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(key => (
    Object.prototype.hasOwnProperty.call(right, key)
    && jsonValuesEqual(left[key], right[key])
  ));
}

function bundlesEqualExceptVersion(left, right) {
  const leftKeys = Object.keys(left).filter(key => key !== 'v');
  const rightKeys = Object.keys(right).filter(key => key !== 'v');
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(key => (
    Object.prototype.hasOwnProperty.call(right, key)
    && jsonValuesEqual(left[key], right[key])
  ));
}

// Selects the exact JSON to flush. An equivalent v2 stash is upgraded by
// selecting the current v3 serialization; all other mismatches are rejected.
function selectPendingBundleForFlush(stashedJson, currentJson) {
  const stashed = parseReadableBundleJson(stashedJson);
  if (!stashed) return null;

  if (currentJson === undefined || currentJson === null) return stashedJson;
  const current = parseReadableBundleJson(currentJson);
  if (!current) return null;

  if (stashedJson === currentJson) return stashedJson;
  if (
    stashed.v === 2
    && current.v === 3
    && bundlesEqualExceptVersion(stashed, current)
  ) {
    return currentJson;
  }
  return null;
}

export { selectPendingBundleForFlush };
