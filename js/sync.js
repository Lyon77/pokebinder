const SYNC_PAT_KEY = 'pokebinder-sync-pat';
const SYNC_GIST_KEY = 'pokebinder-sync-gist-id';
const SAVE_DEBOUNCE_MS = 5000;

let syncPat = localStorage.getItem(SYNC_PAT_KEY) || '';
let syncGistId = localStorage.getItem(SYNC_GIST_KEY) || '';
let saveTimer = null;
let pollTimer = null;
let lastSavedJson = null;   // content of the last successful push (or baseline from remote)
let pendingJson = null;     // content of the queued/in-flight save; cleared on success
let rateLimitResetAt = 0;   // unix ms; don't PATCH before this (GitHub gist_update: 100/hr)
let onSyncStatus = null;
let onRemoteChange = null;

function isSyncConfigured() {
  return !!(syncPat && syncGistId);
}

function hasPendingLocalChange() {
  return !!(saveTimer || pendingJson !== null);
}

function getSyncConfig() {
  return { pat: syncPat, gistId: syncGistId };
}

function setSyncConfig(pat, gistId) {
  syncPat = pat;
  syncGistId = gistId;
  localStorage.setItem(SYNC_PAT_KEY, pat);
  localStorage.setItem(SYNC_GIST_KEY, gistId);
}

function clearSyncConfig() {
  syncPat = '';
  syncGistId = '';
  localStorage.removeItem(SYNC_PAT_KEY);
  localStorage.removeItem(SYNC_GIST_KEY);
}

function setStatusCallback(cb) {
  onSyncStatus = cb;
}

function setRemoteChangeCallback(cb) {
  onRemoteChange = cb;
}

function emitStatus(status, message) {
  if (onSyncStatus) onSyncStatus(status, message);
}

async function loadFromGist() {
  if (!isSyncConfigured()) return null;
  emitStatus('loading', 'Syncing...');
  try {
    const res = await fetch(`https://api.github.com/gists/${syncGistId}`, {
      headers: {
        Authorization: `token ${syncPat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        emitStatus('error', 'Bad token');
        throw new Error('Invalid or expired token');
      }
      if (res.status === 404) {
        emitStatus('error', 'Gist not found');
        throw new Error('Gist not found');
      }
      throw new Error(`GitHub API error: ${res.status}`);
    }
    const gist = await res.json();
    const file = gist.files['collection.json'];
    if (!file) {
      emitStatus('synced', 'Synced (empty)');
      return null;
    }
    const data = JSON.parse(file.content);
    emitStatus('synced', 'Synced');
    return { data, raw: file.content };
  } catch (err) {
    if (!err.message.includes('Invalid') && !err.message.includes('not found')) {
      emitStatus('error', 'Sync failed');
    }
    throw err;
  }
}

async function saveToGist(serialized) {
  if (!isSyncConfigured()) return;
  saveTimer = null;
  if (Date.now() < rateLimitResetAt) {
    scheduleRateLimitRetry();
    emitRateLimitStatus();
    return;
  }
  emitStatus('saving', 'Saving...');
  try {
    const res = await fetch(`https://api.github.com/gists/${syncGistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${syncPat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'collection.json': {
            content: serialized,
          },
        },
      }),
    });
    if (!res.ok) {
      if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
        const resetUnix = parseInt(res.headers.get('x-ratelimit-reset'), 10);
        if (!Number.isNaN(resetUnix)) rateLimitResetAt = resetUnix * 1000;
        scheduleRateLimitRetry();
        emitRateLimitStatus();
        return;
      }
      throw new Error(`GitHub API error: ${res.status}`);
    }
    lastSavedJson = serialized;
    if (pendingJson === serialized) pendingJson = null;
    emitStatus('synced', 'Synced');
  } catch (err) {
    if (pendingJson === serialized) pendingJson = null;
    emitStatus('error', 'Save failed');
    console.error('Gist save failed:', err);
  }
}

function scheduleSave(stateData) {
  if (!isSyncConfigured()) return;
  const serialized = typeof stateData === 'string' ? stateData : JSON.stringify(stateData);
  // Skip if content matches the latest queued or confirmed-pushed state
  const effectiveLatest = pendingJson !== null ? pendingJson : lastSavedJson;
  if (serialized === effectiveLatest) return;
  clearTimeout(saveTimer);
  pendingJson = serialized;
  saveTimer = setTimeout(() => {
    if (pendingJson !== null) saveToGist(pendingJson);
  }, SAVE_DEBOUNCE_MS);
}

function scheduleRateLimitRetry() {
  clearTimeout(saveTimer);
  const delay = Math.max(1000, rateLimitResetAt - Date.now() + 2000);
  saveTimer = setTimeout(() => {
    if (pendingJson !== null) saveToGist(pendingJson);
  }, delay);
}

function emitRateLimitStatus() {
  const mins = Math.max(1, Math.ceil((rateLimitResetAt - Date.now()) / 60000));
  emitStatus('error', `Rate limited — retry in ${mins}m`);
}

async function pollForChanges() {
  if (!isSyncConfigured()) return;
  // Skip pull if there's a pending/in-flight local save — don't clobber unsaved state
  if (saveTimer || pendingJson !== null) return;
  emitStatus('loading', 'Checking...');
  try {
    const res = await fetch(`https://api.github.com/gists/${syncGistId}`, {
      headers: {
        Authorization: `token ${syncPat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      emitStatus('error', 'Poll failed');
      return;
    }
    const gist = await res.json();
    const file = gist.files['collection.json'];
    if (!file) {
      emitStatus('synced', 'Synced');
      return;
    }
    const remoteJson = file.content;
    if (lastSavedJson !== null && remoteJson !== lastSavedJson) {
      cancelPendingSave();
      lastSavedJson = remoteJson;
      const data = JSON.parse(remoteJson);
      if (onRemoteChange) onRemoteChange(data);
      emitStatus('synced', 'Updated from remote');
    } else {
      if (lastSavedJson === null) lastSavedJson = remoteJson;
      emitStatus('synced', 'Synced');
    }
  } catch {
    emitStatus('error', 'Poll failed');
  }
}

function startPolling(intervalMs = 10000) {
  stopPolling();
  pollTimer = setInterval(pollForChanges, intervalMs);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function setLastSavedJson(data) {
  lastSavedJson = typeof data === 'string' ? data : JSON.stringify(data);
  pendingJson = null;
}

function cancelPendingSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  pendingJson = null;
}

export {
  isSyncConfigured, getSyncConfig, setSyncConfig, clearSyncConfig,
  hasPendingLocalChange,
  setStatusCallback, setRemoteChangeCallback, setLastSavedJson,
  loadFromGist, saveToGist, scheduleSave, cancelPendingSave,
  startPolling, stopPolling,
};
