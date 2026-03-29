const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());
app.use(express.static('public'));

// 1. These come from your Canvas Developer Key settings (Keep using process.env for safety!)
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1';
const CLIENT_ID = process.env.CANVAS_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
const REDIRECT_URI = 'https://k5-custom-dashboard.onrender.com/auth/canvas/callback';

// STEP A: The Login Route
app.get('/login', (req, res) => {
    const canvasAuthUrl = `https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses url:get|/api/v1/calendar_events`;
    res.redirect(canvasAuthUrl);
});

// STEP B: The Callback Route
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
        res.cookie('canvas_token', userToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
        res.redirect('/'); 
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.status(500).send('Login failed. Please try again.');
    }
});

// NEW: Logout Route
app.get('/logout', (req, res) => {
    res.clearCookie('canvas_token');
    res.redirect('/');
});

// NEW: Get Student Profile (For Name)
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

// STEP C: The Data Route (Courses)
app.get('/api/courses', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });

    try {
        const response = await axios.get(`${CANVAS_API_URL}/courses`, {
            params: { include: ['enrollments'], enrollment_state: 'active' },
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        const validCourses = response.data.filter(c => c.name);
        res.json(validCourses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// NEW: Get Calendar Events
app.get('/api/calendar', async (req, res) => {
    const userToken = req.cookies.canvas_token;
    if (!userToken) return res.status(401).json({ error: 'Not logged in' });

    try {
        const response = await axios.get(`${CANVAS_API_URL}/calendar_events`, {
            params: { 
                type: 'event', 
                context_codes: ['user_self'],
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Next 7 days
            },
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
