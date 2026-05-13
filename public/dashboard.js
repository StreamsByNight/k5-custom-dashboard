/**
 * K5 Dashboard Logic - Stride K12 Version
 */

async function initDashboard() {
    const grid = document.getElementById('course-grid');
    
    // 1. Fetch student name and update UI
    await fetchStudentName();

    // 2. Setup Tab Clicking (Courses vs Agenda/Calendar)
    setupTabs();

    // 3. Setup Theme listener (if settings modal is used)
    const savedTheme = localStorage.getItem('k5_theme') || 'forest';
    document.body.className = `dashboard-theme-${savedTheme}`;

    try {
        // 4. Default view: Load Courses
        await loadCourses();
    } catch (err) {
        console.error("Dashboard Error:", err);
        if (grid) grid.innerHTML = `<p>Oops! Something went wrong. Please refresh.</p>`;
    }
}

// Fetches the real student name from your Node server
async function fetchStudentName() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const user = await response.json();
            const nameElement = document.querySelector('.user-name');
            // short_name is a standard Canvas field, falling back to name
            if (nameElement) nameElement.innerText = user.short_name || user.name || "Student";
        } else if (response.status === 401) {
            showLoginScreen();
        }
    } catch (err) {
        console.log("Could not fetch name");
    }
}

// Makes the Top Tabs clickable
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            // UI Update
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const text = tab.innerText.toLowerCase();
            if (text === 'courses') {
                await loadCourses();
            } else if (text === 'agenda' || text === 'announcements') {
                await loadAgenda(); // Using the planner/agenda logic
            }
        });
    });
}

async function loadCourses() {
    const grid = document.getElementById('course-grid');
    if (!grid) return;
    
    grid.innerHTML = '<p class="loading-text">Loading your classes...</p>';

    try {
        const response = await fetch('/api/courses');

        if (response.status === 401) {
            showLoginScreen();
            return;
        }

        const courses = await response.json();
        
        if (!courses || courses.length === 0) {
            showEmptyState();
        } else {
            renderCourseCards(courses);
        }
    } catch (err) {
        grid.innerHTML = '<p>Unable to load courses. Please check your connection.</p>';
    }
}

function renderCourseCards(courses) {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = ''; 

    courses.forEach(course => {
        // Extracting grade data from the enrollment object
        const enrollment = course.enrollments ? course.enrollments[0] : null;
        const score = enrollment ? Math.round(enrollment.computed_current_score || 0) : 0;
        const gradeLetter = enrollment ? enrollment.computed_current_grade || '--' : '--';
        
        const themeColor = getSubjectColor(course.name);
        const icon = getSubjectIcon(course.name);

        const card = document.createElement('div');
        card.className = 'course-card';
        card.style.cursor = 'pointer';
        
        // Open the specific course in Canvas in a new tab
        card.onclick = () => window.open(`https://stridek12academy.com/courses/${course.id}`, '_blank');

        card.innerHTML = `
            <div class="card-header" style="background-color: ${themeColor}">
                <div class="subject-icon-bg">
                    <img src="${icon}" alt="icon" style="width: 40px; height: 40px;">
                </div>
                <h3>${course.course_code || 'Course'}</h3>
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

// Fetches and renders Agenda items (Planner API)
async function loadAgenda() {
    const grid = document.getElementById('course-grid');
    grid.innerHTML = '<p class="loading-text">Looking at your schedule...</p>';

    try {
        const response = await fetch('/api/assignments'); // Matches the planner route in our server
        const data = await response.json();
        const items = data.planner || [];

        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="completion-state" style="text-align: center; grid-column: 1/-1;">
                    <h2 class="completion-text">All Done!</h2>
                    <p>You have finished all your work for today.</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'course-card agenda-card';
            
            // Logic to determine type (Assignment vs Quiz vs Page)
            const typeLabel = item.plannable_type.replace('_', ' ');
            const date = new Date(item.plannable.todo_date || item.plannable.due_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            itemCard.innerHTML = `
                <div class="card-body">
                    <span class="type-pill">${typeLabel}</span>
                    <h3 style="margin: 10px 0; color: #0066FF;">${item.plannable.title}</h3>
                    <p>⏰ Due: ${timeStr}</p>
                    <button class="join-btn" onclick="window.open('${item.html_url}', '_blank')">Start Lesson</button>
                </div>
            `;
            grid.appendChild(itemCard);
        });
    } catch (err) {
        grid.innerHTML = '<p>Could not load agenda items.</p>';
    }
}

function getSubjectIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('math')) return 'image_4f3261.png';
    if (n.includes('ela') || n.includes('reading') || n.includes('language')) return 'image_4f3266.png';
    if (n.includes('science')) return 'image_4f322b.png';
    if (n.includes('history') || n.includes('social')) return 'image_4f2f80.png';
    return 'image_4f2f80.png'; // Default book icon
}

function getSubjectColor(courseName) {
    const name = courseName.toLowerCase();
    if (name.includes('math')) return '#4CAF50'; // Green
    if (name.includes('ela') || name.includes('reading')) return '#FF5722'; // Orange
    if (name.includes('science')) return '#2196F3'; // Blue
    if (name.includes('history')) return '#795548'; // Brown
    return '#0066FF'; // Stride Blue
}

function showLoginScreen() {
    // If the session is expired or missing, show a friendly Stride Login
    document.body.innerHTML = `
        <div class="login-container" style="text-align: center; padding-top: 100px; font-family: 'Comic Sans MS', sans-serif;">
            <img src="fox-mascot.png" style="width: 180px; margin-bottom: 20px;">
            <h1 style="color: #0066FF;">Ready to Learn?</h1>
            <p>Click the button below to sign into your Stride K12 Dashboard!</p>
            <a href="/login" class="login-btn" style="
                background: #0066FF; 
                color: white; 
                padding: 18px 40px; 
                text-decoration: none; 
                border-radius: 30px;
                font-size: 1.2rem;
                font-weight: bold;
                display: inline-block;
                margin-top: 25px;
                box-shadow: 0 4px 15px rgba(0,102,255,0.3);
            ">Log In with Canvas</a>
        </div>
    `;
}

function showEmptyState() {
    const grid = document.getElementById('course-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="empty-state" style="text-align: center; grid-column: 1 / -1; padding: 50px;">
            <img src="fox-mascot.png" alt="No courses" style="width: 150px; opacity: 0.7;">
            <p style="font-size: 1.2rem; margin-top: 20px;">No active classes found right now. Check back soon!</p>
        </div>
    `;
}

// Start the dashboard once the HTML is ready
document.addEventListener('DOMContentLoaded', initDashboard);
