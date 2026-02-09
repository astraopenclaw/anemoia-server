const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json()); // Enable JSON body parsing

// Simple File DB
const DB_FILE = 'users.json';
let users = [];

if (fs.existsSync(DB_FILE)) {
    try {
        users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading users DB:', e.message);
    }
}

function saveUsers() {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// === AUTH API ===

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password, // TODO: Hash this!
        joinedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers();
    
    console.log(`[AUTH] New user: ${name} (${email})`);
    res.status(201).json({ success: true, user: { id: newUser.id, name: newUser.name } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        console.log(`[AUTH] Login success: ${user.name}`);
        res.json({ success: true, token: 'mock_token_' + user.id, user: { id: user.id, name: user.name } });
    } else {
        console.log(`[AUTH] Login failed for ${email}`);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Log everything!
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers));
    
    // Capture body
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
        if (data) {
            console.log('Body:', data);
            // Save to file for analysis
            fs.appendFileSync('traffic.log', `\n--- ${timestamp} ---\n${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\nBody: ${data}\n`);
        }
        next();
    });
});

// Catch-all route (Google+ uses many weird paths)
app.use('/files', express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.apk')) {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    }
  }
}));

app.all('*', (req, res) => {
    // Determine what to return based on URL
    if (req.url.includes('plusi')) {
        res.status(500).send('Not Implemented Yet (Anemoia)');
    } else {
        res.status(404).send('Anemoia G+ Server');
    }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Anemoia G+ Server listening on port ${PORT}`);
    console.log('Ready to capture traffic! 🕸️');
});
