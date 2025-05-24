// --- server.js (WebSocket Backend) ---
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// In-memory store for video progress
const progressStore = new Map();

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a.start - b.start);
  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const current = intervals[i];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const { videoId, interval } = JSON.parse(message);
      const existing = progressStore.get(videoId) || [];
      const merged = mergeIntervals([...existing, interval]);
      progressStore.set(videoId, merged);

      ws.send(JSON.stringify({ type: 'progress-update', intervals: merged }));
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
});

app.get('/progress/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  res.json({ intervals: progressStore.get(videoId) || [] });
});
app.delete('/progress/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  progressStore.delete(videoId);
  res.json({ message: `Progress for video "${videoId}" has been cleared.` });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));