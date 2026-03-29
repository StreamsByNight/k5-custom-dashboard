const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());
app.use(express.static('public'));

// 1. These come from your Canvas Developer Key settings
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1';
const CLIENT_ID = process.env.CANVAS_CLIENT_ID;
const CLIENT_SECRET = process.env.CANVAS_CLIENT_SECRET;
const REDIRECT_URI = 'https://k5-custom-dashboard.onrender.com/auth/canvas/callback';

// STEP A: The Login Route
// This sends the student to the Stride K12 login page
app.get('/login', (req, res) => {
    const canvasAuthUrl = `https://stridek12academy.com/login/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=url:get|/api/v1/courses`;
    res.redirect(canvasAuthUrl);
});

// STEP B: The Callback Route
// Canvas sends the user back here with a temporary "code"
app.get('/auth/canvas/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange the code for a permanent User Access Token
        const response = await axios.post('https://stridek12academy.com/login/oauth2/token', {
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        });

        const userToken = response.data.access_token;

        // Store the token in a secure cookie (valid for 30 days)
        res.cookie('canvas_token', userToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
        
        // Send them to your custom K5 dashboard
        res.redirect('/'); 
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.status(500).send('Login failed. Please try again.');
    }
});

// STEP C: The Data Route
// Your dashboard.js calls this to get the logged-in student's courses
app.get('/api/courses', async (req, res) => {
    const userToken = req.cookies.canvas_token;

    if (!userToken) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try {
        const response = await axios.get(`${CANVAS_API_URL}/courses`, {
            params: { 
                include: ['enrollments', 'course_image'], 
                enrollment_state: 'active',
                per_page: 50 
            },
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        // Filter out courses that don't have a name (Canvas weirdness)
        const validCourses = response.data.filter(c => c.name);
        res.json(validCourses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from Canvas' });
    }
});

app.listen(3000, () => console.log('Dashboard server running!'));
