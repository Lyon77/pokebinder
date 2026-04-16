const SYNC_PAT_KEY = 'pokebinder-sync-pat';
const SYNC_GIST_KEY = 'pokebinder-sync-gist-id';

let syncPat = localStorage.getItem(SYNC_PAT_KEY) || '';
let syncGistId = localStorage.getItem(SYNC_GIST_KEY) || '';
let saveTimer = null;
let pollTimer = null;
let lastSavedJson = null;
let onSyncStatus = null;
let onRemoteChange = null;

function isSyncConfigured() {
  return !!(syncPat && syncGistId);
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
    return data;
  } catch (err) {
    if (!err.message.includes('Invalid') && !err.message.includes('not found')) {
      emitStatus('error', 'Sync failed');
    }
    throw err;
  }
}

async function saveToGist(stateData) {
  if (!isSyncConfigured()) return;
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
            content: JSON.stringify(stateData, null, 2),
          },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }
    lastSavedJson = JSON.stringify(stateData, null, 2);
    emitStatus('synced', 'Synced');
  } catch (err) {
    emitStatus('error', 'Save failed');
    console.error('Gist save failed:', err);
  }
}

function scheduleSave(stateData) {
  if (!isSyncConfigured()) return;
  clearTimeout(saveTimer);
  // Update lastSavedJson immediately so polls don't overwrite with stale remote data
  lastSavedJson = JSON.stringify(stateData, null, 2);
  saveTimer = setTimeout(() => saveToGist(stateData), 2000);
}

async function pollForChanges() {
  if (!isSyncConfigured()) return;
  // Skip pull if there's a pending local save waiting to push
  if (saveTimer) return;
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
  lastSavedJson = JSON.stringify(data, null, 2);
}

function cancelPendingSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
}

export {
  isSyncConfigured, getSyncConfig, setSyncConfig, clearSyncConfig,
  setStatusCallback, setRemoteChangeCallback, setLastSavedJson,
  loadFromGist, saveToGist, scheduleSave, cancelPendingSave,
  startPolling, stopPolling,
};
