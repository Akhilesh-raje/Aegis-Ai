/**
 * AegisAI — REST API Client
 * 
 * Contains ONLY action-based endpoints (POST/DELETE/mutation) and
 * rare single-use GETs.  All high-frequency polling data is now
 * delivered via WebSocket channels through useAegisSocket().
 * 
 * WebSocket channels replace these former REST endpoints:
 *   STATS        → /api/stats
 *   TELEMETRY    → /api/telemetry
 *   INSIGHTS     → /api/security-insights
 *   THREATS      → /api/threats
 *   RISK_HISTORY → /api/risk/history
 *   GRAPH        → /api/graph
 *   FLEET        → /api/fleet
 *   IDENTITY     → /api/identity
 *   LOCATION     → /api/system/location
 */

const API_BASE = '/api';

function getAuthHeaders() {
  return {};
}

// ---------------------------------------------------------------------------
// Single-Use / On-Demand GETs  (not polled)
// ---------------------------------------------------------------------------

export async function fetchThreatDetail(threatId) {
  const res = await fetch(`${API_BASE}/threats/${threatId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch threat detail');
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/model/info`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch model info');
  return res.json();
}


// ---------------------------------------------------------------------------
// Action Endpoints  (POST / mutation)
// ---------------------------------------------------------------------------

export async function simulateAttack(attackType, intensity = null) {
  const body = { attack_type: attackType };
  if (intensity) body.intensity = intensity;
  const res = await fetch(`${API_BASE}/simulate-attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to simulate attack');
  return res.json();
}

export async function startStatefulSimulation(scenario) {
  const res = await fetch(`${API_BASE}/simulate-stateful`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error('Failed to start stateful simulation');
  return res.json();
}

export async function executeResponse(threatId, action, target = null) {
  const body = { threat_id: threatId, action };
  if (target) body.target = target;
  const res = await fetch(`${API_BASE}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to execute response');
  return res.json();
}

export async function resetSystem() {
  const res = await fetch(`${API_BASE}/reset`, { 
    method: 'POST',
    headers: getAuthHeaders() 
  });
  if (!res.ok) throw new Error('Failed to reset system');
  return res.json();
}

export async function executeChatQuery(query, sessionId = '') {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId }),
  });
  if (!res.ok) throw new Error('Failed to execute chat query');
  return res.json();
}

export async function fetchAIStatus() {
  const res = await fetch(`${API_BASE}/ai/status`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch AI status');
  return res.json();
}

export async function analyzeEvent(threatId) {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ threat_id: threatId }),
  });
  if (!res.ok) throw new Error('Failed to analyze event');
  return res.json();
}



// ---------------------------------------------------------------------------
// Settings CRUD  (must remain REST — admin-only, not streamed)
// ---------------------------------------------------------------------------

export async function fetchWebhooks() {
  const res = await fetch(`${API_BASE}/settings/webhooks`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch webhooks');
  return res.json();
}

export async function addWebhook(url) {
  const res = await fetch(`${API_BASE}/settings/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error('Failed to add webhook');
  return res.json();
}

export async function deleteWebhook(id) {
  const res = await fetch(`${API_BASE}/settings/webhooks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete webhook');
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/settings/users`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function addUser(username, password, role) {
  const res = await fetch(`${API_BASE}/settings/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ username, password, role })
  });
  if (!res.ok) throw new Error('Failed to add user');
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/settings/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}
