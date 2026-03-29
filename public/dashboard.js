/**
 * K5 Dashboard Logic - Stride K12 Version
 */

async function initDashboard() {
    const grid = document.getElementById('course-grid');
    
    try {
        // 1. Try to fetch courses from your Render server
        const response = await fetch('/api/courses');

        // 2. If the server says 401 (Unauthorized), the user isn't logged in
        if (response.status === 401) {
            showLoginScreen();
            return;
        }

        const courses = await response.json();
        
        if (courses.length === 0) {
            showEmptyState(); // Show the Fox/Island image
        } else {
            renderCourseCards(courses);
        }

    } catch (err) {
        console.error("Dashboard Error:", err);
        grid.innerHTML = `<p>Oops! Something went wrong. Please refresh.</p>`;
    }
}

function renderCourseCards(courses) {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = ''; // Clear loading state

    courses.forEach(course => {
        // Extract grade data from the 'enrollments' array Canvas provides
        const enrollment = course.enrollments ? course.enrollments[0] : null;
        const score = enrollment ? Math.round(enrollment.computed_current_score || 0) : 0;
        const gradeLetter = enrollment ? enrollment.computed_current_grade || '--' : '--';
        
        const themeColor = getSubjectColor(course.name);

        const card = document.createElement('div');
        card.className = 'course-card';
        card.innerHTML = `
            <div class="card-header" style="background-color: ${themeColor}">
                <div class="subject-icon">📖</div>
                <h3>${course.course_code || 'Class'}</h3>
            </div>
            <div class="card-body">
                <p class="course-name">${course.name}</p>
                <div class="grade-container">
                    <div class="grade-circle" style="border-color: ${themeColor}">
                        <span class="score">${score}%</span>
                        <span class="letter">${gradeLetter}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Logic to match the colors in your uploaded K-5 images
function getSubjectColor(courseName) {
    const name = courseName.toLowerCase();
    if (name.includes('math')) return '#4CAF50';    // Green
    if (name.includes('ela') || name.includes('reading')) return '#FF5722'; // Orange/Red
    if (name.includes('science')) return '#2196F3'; // Bright Blue
    if (name.includes('social') || name.includes('history')) return '#9C27B0'; // Purple
    return '#0066FF'; // Default Stride Blue
}

function showLoginScreen() {
    // Redirects to the /login route we created in server.js
    document.body.innerHTML = `
        <div class="login-container" style="text-align: center; padding-top: 100px;">
            <img src="your-fox-image.png" style="width: 200px;">
            <h1>Welcome to your Dashboard!</h1>
            <p>Please log in with your Stride K12 account to see your classes.</p>
            <a href="/login" class="login-btn" style="
                background: #0066FF; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px;
                font-weight: bold;
            ">Log In with Canvas</a>
        </div>
    `;
}

function showEmptyState() {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <img src="image_4f3225.png" alt="No courses">
            <p>No active courses found. Check back later!</p>
        </div>
    `;
}

// Start the app
document.addEventListener('DOMContentLoaded', initDashboard);
