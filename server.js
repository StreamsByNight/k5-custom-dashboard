const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

app.use(cookieParser());
// Necessary for parsing the LTI launch data from the Canvas sidebar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURATION ---
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1';
const CLIENT_ID = process.env.CANVAS_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
const REDIRECT_URI = 'https://k5-custom-dashboard.onrender.com/auth/canvas/callback';

// --- LTI HANDSHAKE ---
app.post('/', (req, res) => {
    // Prevents "Cannot POST /" when clicking the Globe icon in Canvas
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- OAUTH ROUTES ---

app.get('/login', (req, res) => {
    const canvasAuthUrl = `https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses url:get|/api/v1/calendar_events url:get|/api/v1/users/self url:get|/api/v1/planner/items`;
    res.redirect(canvasAuthUrl);
});

app.get('/auth/canvas/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const response = await axios.post('https://stridek12academy.com/login/oauth2/token', {
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        });
        const userToken = response.data.access_token;
        // sameSite: 'none' and secure: true are required for embedding in Canvas Iframes
        res.cookie('canvas_token', userToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'none', 
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });
        res.redirect('/'); 
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.status(500).send('Login failed. Please try again.');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('canvas_token');
    res.redirect('/');
});

// --- API ROUTES (K-5 Specific) ---

// 1. Profile Data
app.get('/api/profile', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });

    try {
        const response = await axios.get(`${CANVAS_API_URL}/users/self`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// 2. Course Data (Required by your frontend renderCourseCards)
app.get('/api/courses', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });

    try {
        const response = await axios.get(`${CANVAS_API_URL}/courses`, {
            params: { include: ['enrollments'], enrollment_state: 'active' },
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        // Filter out courses that don't have a name (like blank shells)
        res.json(response.data.filter(c => c.name));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// 3. Planner/Agenda Data
app.get(['/api/assignments', '/api/planner'], async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });

    try {
        const response = await axios.get(`${CANVAS_API_URL}/planner/items`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        res.json({
            planner: response.data,
            showFireworks: response.data.length === 0,
            status: "success"
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch planner' });
    }
});

// 4. Live Sessions (Mock Data)
app.get(['/api/classconnect', '/api/coach/classconnect'], (req, res) => {
    const now = new Date();
    res.json([{
        id: "session-999",
        name: "K12 Support Class",
        instructorName: "Support Team",
        startTime: new Date(now.getTime() - 600000).toISOString(),
        endTime: new Date(now.getTime() + 3000000).toISOString(),
        meetingUrl: "https://k12learning.online/rooms/flg-u5z-06j-uer/join", 
        isLive: true
    }]);
});

// --- FALLBACK (FIXED FOR NODE V22) ---

/** * Use '/:path*' instead of '*' to satisfy the new path-to-regexp 
 * requirements in Node.js v22/Express.
 */
app.get('/:path*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`K5 Server running on port ${PORT}`));
