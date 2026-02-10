const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

// DB Files
const DB_FILE = 'users.json';
const POSTS_FILE = 'posts.json';
let users = [];
let posts = [];

// Load Data
try { if (fs.existsSync(DB_FILE)) users = JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){}
try { if (fs.existsSync(POSTS_FILE)) posts = JSON.parse(fs.readFileSync(POSTS_FILE)); } catch(e){}

function saveUsers() { fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2)); }
function savePosts() { fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2)); }

// === AUTH ===
app.post('/api/register', (req, res) => {
    console.log('[AUTH] Register request:', req.body);
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({error: 'Missing fields'});
    if (users.find(u => u.email === email)) return res.status(409).json({error: 'Exists'});
    
    const newUser = { id: Date.now().toString(), name, email, password, joinedAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers();
    console.log(`[AUTH] Registered user: ${name}, ID: ${newUser.id}`);
    res.status(201).json({success: true, user: newUser});
});

app.post('/api/login', (req, res) => {
    console.log('[AUTH] Login request:', req.body);
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        console.log(`[AUTH] Login success: ${user.name}, ID: ${user.id}`);
        res.json({success: true, token: 'token_'+user.id, user});
    } else {
        console.log(`[AUTH] Login failed for ${email}`);
        res.status(401).json({error: 'Invalid credentials'});
    }
});

// === POSTS ===
app.get('/api/posts', (req, res) => {
    res.json(posts.slice().reverse());
});

app.post('/api/posts', (req, res) => {
    console.log('[POST] Create request body:', req.body);
    const { content, authorId } = req.body;
    console.log(`[POST] Author ID from request: "${authorId}"`);
    
    if (!content || !authorId) {
        console.error('[POST] Missing content or authorId');
        return res.status(400).json({error: 'Missing data'});
    }
    
    const user = users.find(u => u.id === authorId);
    if (!user) {
        console.error(`[POST] User not found by ID: ${authorId}`);
        // Log all users to debug
        console.log(`[DEBUG] Available User IDs: ${users.map(u => u.id).join(', ')}`);
        // Allow posting as Guest for debug? No, better fix it.
        // return res.status(400).json({error: 'User not found'});
    }
    
    const post = {
        id: Date.now().toString(),
        author: user ? user.name : 'Unknown',
        authorId,
        content,
        date: new Date().toISOString(),
        likes: 0,
        comments: []
    };
    posts.push(post);
    savePosts();
    console.log(`[POST] Created by ${post.author}`);
    res.status(201).json(post);
});

// === COMMENTS & LIKES ===
app.post('/api/posts/:id/like', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({error: 'Post not found'});
    
    post.likes = (post.likes || 0) + 1;
    savePosts();
    res.json({success: true, likes: post.likes});
});

app.post('/api/posts/:id/comments', (req, res) => {
    const { content, authorId } = req.body;
    const post = posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({error: 'Post not found'});
    
    const user = users.find(u => u.id === authorId);
    const comment = {
        id: Date.now().toString(),
        author: user ? user.name : 'Unknown',
        content,
        date: new Date().toISOString()
    };
    
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    savePosts();
    res.status(201).json(comment);
});

// === PROFILE ===
app.get('/api/users/:id', (req, res) => {
    console.log(`[PROFILE] Request for ID: "${req.params.id}"`);
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
        console.log(`[PROFILE] User NOT found!`);
        console.log(`[DEBUG] Available User IDs: ${users.map(u => u.id).join(', ')}`);
        return res.status(404).json({error: 'User not found'});
    }
    
    const userPosts = posts.filter(p => p.authorId === user.id);
    res.json({ ...user, posts: userPosts });
});

// === STATIC FILES ===
app.use('/files', express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.apk')) {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    }
  }
}));

// Log everything!
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// Catch-all
app.all('*', (req, res) => {
    if (req.url.includes('plusi')) {
        res.status(500).send('Not Implemented Yet (Anemoia)');
    } else {
        res.status(404).send('Anemoia G+ Server');
    }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Anemoia G+ Server v0.3 (Debug) Ready! 🚀`);
});
