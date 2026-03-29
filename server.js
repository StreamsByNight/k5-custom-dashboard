const axios = require('axios');

// Your Canvas info (usually stored in Render Environment Variables)
const CANVAS_API_URL = 'https://stridek12academy.com/api/v1'; 
const CANVAS_TOKEN = process.env.CANVAS_API_TOKEN; 

app.get('/api/courses', async (req, res) => {
    try {
        const response = await axios.get(`${CANVAS_API_URL}/courses`, {
            params: { include: ['enrollments'], enrollment_state: 'active' },
            headers: { 'Authorization': `Bearer ${CANVAS_TOKEN}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from Canvas' });
    }
});
