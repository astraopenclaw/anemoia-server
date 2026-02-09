const express = require('express');
const fs = require('fs');
const app = express();

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
