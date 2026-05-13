const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Serve static files FIRST
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURATION ---
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1';
const CLIENT_ID = process.env.CANVAS_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
const REDIRECT_URI = 'https://k5-custom-dashboard.onrender.com/auth/canvas/callback';

// --- LTI HANDSHAKE ---
app.post('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- OAUTH ROUTES ---

app.get('/login', (req, res) => {
    // prompt=none makes it skip the authorize button for returning users
    const canvasAuthUrl = `https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses url:get|/api/v1/calendar_events url:get|/api/v1/users/self url:get|/api/v1/planner/items&prompt=none`;
    res.redirect(canvasAuthUrl);
});

app.get('/auth/canvas/callback', async (req, res) => {
    const { code, error } = req.query;

    // Handle first-time users where prompt=none fails
    if (error === 'interaction_required') {
        return res.redirect(`https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses url:get|/api/v1/calendar_events url:get|/api/v1/users/self url:get|/api/v1/planner/items`);
    }

    try {
        const response = await axios.post('https://stridek12academy.com/login/oauth2/token', {
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        });
        
        const userToken = response.data.access_token;
        
        res.cookie('canvas_token', userToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'none', 
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });
        res.redirect('/'); 
    } catch (err) {
        res.status(500).send('Login failed. Refresh Canvas.');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('canvas_token');
    res.redirect('/');
});

// --- API ROUTES ---

app.get('/api/profile', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });
    try {
        const response = await axios.get(`${CANVAS_API_URL}/users/self`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        res.json(response.data);
    } catch (error) { res.status(500).json({ error: 'Profile error' }); }
});

app.get('/api/courses', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });
    try {
        const response = await axios.get(`${CANVAS_API_URL}/courses`, {
            params: { include: ['enrollments'], enrollment_state: 'active' },
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        res.json(response.data.filter(c => c.name));
    } catch (error) { res.status(500).json({ error: 'Courses error' }); }
});

// --- THE FINAL NODE V22 FIX ---

// Instead of using '*' which crashes Node v22, we use a specific list of 
// known frontend routes, or use the "app.use" fallback which is safer.

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// This is the most stable way to handle "everything else" in Node 22:
app.use((req, res, next) => {
    // If it's an API call that reached here, it doesn't exist (404)
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // Otherwise, serve the dashboard
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`K5 Server running on port ${PORT}`));
