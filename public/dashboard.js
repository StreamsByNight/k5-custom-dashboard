/**
 * K5 Dashboard Logic - Stride K12 Version
 */

async function initDashboard() {
    const grid = document.getElementById('course-grid');
    
    // 1. Fetch student name first
    await fetchStudentName();

    // 2. Setup Tab Clicking (Courses vs Agenda/Calendar)
    setupTabs();

    try {
        // 3. Default view: Load Courses
        await loadCourses();
    } catch (err) {
        console.error("Dashboard Error:", err);
        grid.innerHTML = `<p>Oops! Something went wrong. Please refresh.</p>`;
    }
}

// NEW: Fetches the real student name from your server
async function fetchStudentName() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const user = await response.json();
            const nameElement = document.querySelector('.user-name');
            if (nameElement) nameElement.innerText = user.short_name || user.name;
        }
    } catch (err) {
        console.log("Could not fetch name");
    }
}

// NEW: Makes the Top Tabs clickable
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Logic: Load different data based on tab text
            const text = tab.innerText.toLowerCase();
            if (text === 'courses') {
                await loadCourses();
            } else if (text === 'agenda' || text === 'calendar') {
                await loadCalendar();
            }
        });
    });
}

async function loadCourses() {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = '<p>Loading your classes...</p>';

    const response = await fetch('/api/courses');

    if (response.status === 401) {
        showLoginScreen();
        return;
    }

    const courses = await response.json();
    
    if (courses.length === 0) {
        showEmptyState();
    } else {
        renderCourseCards(courses);
    }
}

function renderCourseCards(courses) {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = ''; 

    courses.forEach(course => {
        const enrollment = course.enrollments ? course.enrollments[0] : null;
        const score = enrollment ? Math.round(enrollment.computed_current_score || 0) : 0;
        const gradeLetter = enrollment ? enrollment.computed_current_grade || '--' : '--';
        
        const themeColor = getSubjectColor(course.name);
        const icon = getSubjectIcon(course.name);

        const card = document.createElement('div');
        card.className = 'course-card';
        
        // NEW: Makes the course clickable to open in Stride
        card.style.cursor = 'pointer';
        card.onclick = () => window.open(`https://stridek12academy.com/courses/${course.id}`, '_blank');

        card.innerHTML = `
            <div class="card-header" style="background-color: ${themeColor}">
                <img src="${icon}" style="width: 30px; height: 30px;">
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

// NEW: Fetches and renders Calendar Events
async function loadCalendar() {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = '<p>Looking at your schedule...</p>';

    const response = await fetch('/api/calendar');
    const events = await response.json();

    grid.innerHTML = '';

    if (events.length === 0) {
        grid.innerHTML = '<p>No lessons today! Time to play.</p>';
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'course-card';
        eventCard.style.borderLeft = "8px solid #FFC107";
        eventCard.style.cursor = "pointer";
        
        // Click to open main calendar
        eventCard.onclick = () => window.open(`https://stridek12academy.com/calendar`, '_blank');

        const startTime = new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        eventCard.innerHTML = `
            <div class="card-body">
                <h3 style="margin: 0; color: #0066FF;">${event.title}</h3>
                <p style="font-weight: bold; margin-top: 10px;">⏰ ${startTime}</p>
                <p>Click to join lesson</p>
            </div>
        `;
        grid.appendChild(eventCard);
    });
}

function getSubjectIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('math')) return 'image_4f3261.png';
    if (n.includes('ela') || n.includes('reading')) return 'image_4f3266.png';
    if (n.includes('science')) return 'image_4f322b.png';
    return 'image_4f2f80.png'; // Default book
}

function getSubjectColor(courseName) {
    const name = courseName.toLowerCase();
    if (name.includes('math')) return '#4CAF50';
    if (name.includes('ela') || name.includes('reading')) return '#FF5722';
    if (name.includes('science')) return '#2196F3';
    return '#0066FF';
}

function showLoginScreen() {
    document.body.innerHTML = `
        <div class="login-container" style="text-align: center; padding-top: 100px; font-family: sans-serif;">
            <img src="image_4f3225.png" style="width: 200px;">
            <h1>Welcome to your Dashboard!</h1>
            <p>Please log in with your Stride K12 account to see your classes.</p>
            <a href="/login" class="login-btn" style="
                background: #0066FF; 
                color: white; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 25px;
                font-weight: bold;
                display: inline-block;
                margin-top: 20px;
            ">Log In with Canvas</a>
        </div>
    `;
}

function showEmptyState() {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = `
        <div class="empty-state" style="text-align: center; grid-column: 1 / -1; padding: 50px;">
            <img src="image_4f3225.png" alt="No courses" style="width: 200px;">
            <p>No active courses found. Check back later!</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', initDashboard);
