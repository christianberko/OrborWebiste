const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/locations', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'json', 'locations.json'), 'utf8', (err, data) => {
      if (err) {
          return res.status(500).json({ error: 'Failed to load locations' });
      }
      res.json(JSON.parse(data));
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${PORT}`);
}); 