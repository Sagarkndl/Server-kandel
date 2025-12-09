// Use same origin as the site
const API_BASE = window.location.origin;

const tempEl = document.getElementById('temp');
const humEl = document.getElementById('hum');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const historyBody = document.getElementById('history-body');

function renderCurrent(reading) {
  tempEl.textContent = reading.temperature.toFixed(1);
  humEl.textContent = reading.humidity.toFixed(1);
  timeEl.textContent = new Date(reading.created_at).toLocaleString();
}

function addHistoryRow(reading, prepend = true) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${reading.id}</td>
    <td>${reading.temperature.toFixed(1)}</td>
    <td>${reading.humidity.toFixed(1)}</td>
    <td>${new Date(reading.created_at).toLocaleString()}</td>
  `;
  if (prepend && historyBody.firstChild) {
    historyBody.insertBefore(tr, historyBody.firstChild);
  } else {
    historyBody.appendChild(tr);
  }
}

// Load history on page load
fetch(`${API_BASE}/api/readings?limit=20`)
  .then(res => res.json())
  .then(data => {
    data.reverse().forEach(r => addHistoryRow(r, false)); // oldest first
    if (data.length > 0) renderCurrent(data[data.length - 1]);
  })
  .catch(err => console.error('Failed to load history:', err));

// WebSocket for live updates
let ws;
function connectWS() {
  statusEl.textContent = 'Connecting...';

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = wsProtocol + '//' + window.location.host;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    statusEl.textContent = 'Connected ✔';
    statusEl.style.color = 'green';
  };

  ws.onmessage = evt => {
    const msg = JSON.parse(evt.data);
    if (msg.type === 'latest-reading' || msg.type === 'new-reading') {
      renderCurrent(msg.data);
      if (msg.type === 'new-reading') {
        addHistoryRow(msg.data, true);
      }
    }
  };

  ws.onclose = () => {
    statusEl.textContent = 'Disconnected – retrying...';
    statusEl.style.color = 'red';
    setTimeout(connectWS, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

connectWS();
