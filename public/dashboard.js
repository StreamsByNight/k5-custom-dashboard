async function loadDashboard() {
    const grid = document.getElementById('course-grid');
    
    try {
        // This calls the route we just made in server.js
        const response = await fetch('/api/courses');
        const courses = await response.json();

        grid.innerHTML = ''; // Clear the "Loading" text

        courses.forEach(course => {
            if (!course.name) return; // Skip empty courses

            // Get the grade if it exists in the data
            const enrollment = course.enrollments ? course.enrollments[0] : null;
            const score = enrollment ? Math.round(enrollment.computed_current_score || 0) : '--';
            const grade = enrollment ? enrollment.computed_current_grade || 'N/A' : 'Active';

            // Pick a color based on the subject name
            const cardColor = getSubjectColor(course.name);

            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <div class="card-header" style="background-color: ${cardColor}">
                    <h3>${course.course_code || 'Course'}</h3>
                </div>
                <div class="card-body">
                    <p class="course-name">${course.name}</p>
                    <div class="grade-container">
                        <div class="grade-circle" style="border-color: ${cardColor}">
                            <span class="score">${score}%</span>
                            <span class="letter">${grade}</span>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = '<p>Make sure your Canvas Token is set in Render!</p>';
    }
}

// Simple helper to match the colors in your images
function getSubjectColor(name) {
    const n = name.toLowerCase();
    if (n.includes('math')) return '#4CAF50'; // Green
    if (n.includes('ela') || n.includes('english')) return '#FF5722'; // Orange
    if (n.includes('science')) return '#2196F3'; // Blue
    return '#0066ff'; // Default Blue
}

document.addEventListener('DOMContentLoaded', loadDashboard);
