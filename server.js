const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Serve static files FIRST to ensure dashboard.js and style.css load correctly
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURATION ---
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1';
const CLIENT_ID = process.env.CANVAS_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
const REDIRECT_URI = 'https://k5-custom-dashboard.onrender.com/auth/canvas/callback';

// --- LTI HANDSHAKE ---
app.post('/', (req, res) => {
    // Serves the dashboard when launched via the Canvas sidebar globe icon
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- OAUTH ROUTES ---

app.get('/login', (req, res) => {
    // Added 'prompt=none' to bypass the "Authorize" screen for returning users
    const canvasAuthUrl = `https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses url:get|/api/v1/calendar_events url:get|/api/v1/users/self url:get|/api/v1/planner/items&prompt=none`;
    res.redirect(canvasAuthUrl);
});

app.get('/auth/canvas/callback', async (req, res) => {
    const { code, error } = req.query;

    // Fallback: If 'prompt=none' fails because it's the user's first time, redirect to normal login
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
        
        // sameSite: 'none' is mandatory for embedding in Canvas
        res.cookie('canvas_token', userToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'none', 
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });
        res.redirect('/'); 
    } catch (err) {
        console.error('OAuth Error:', err.response?.data || err.message);
        res.status(500).send('Login failed. Please refresh the page.');
    }
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

// --- CATCH-ALL (FIXED FOR NODE V22) ---

// This replaces the app.get('*') that was crashing your build
app.get(/^(?!\/(api|login|auth|logout)).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`K5 Server running on port ${PORT}`));
