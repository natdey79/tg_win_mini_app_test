// ============================================================
// 1. INITIALIZE TELEGRAM WEB APP
// ============================================================
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full screen
tg.ready();  // Tell Telegram we're ready

// Show user info if available
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('user-greeting').textContent = 
        `Welcome, ${user.first_name}! 👋`;
}

// ============================================================
// 2. APP STATE
// ============================================================
let tasks = [];

// Load tasks from localStorage
function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        tasks = JSON.parse(saved);
        renderTasks();
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ============================================================
// 3. DOM ELEMENTS
// ============================================================
const taskTitleInput = document.getElementById('task-title');
const taskTimeInput = document.getElementById('task-time');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListEl = document.getElementById('task-list');
const clearAllBtn = document.getElementById('clear-all-btn');

// ============================================================
// 4. CORE FUNCTIONS
// ============================================================

// Add a new task
function addTask() {
    const title = taskTitleInput.value.trim();
    const time = taskTimeInput.value;
    
    // Validate
    if (!title) {
        tg.showPopup({
            title: 'Missing Info',
            message: 'Please enter a task title.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!time) {
        tg.showPopup({
            title: 'Missing Info',
            message: 'Please select a date and time.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Create task
    const task = {
        id: Date.now(),
        title: title,
        time: time,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    
    // Clear inputs
    taskTitleInput.value = '';
    taskTimeInput.value = '';
    
    // Feedback
    tg.HapticFeedback.notificationOccurred('success');
    tg.showPopup({
        title: '✅ Reminder Added!',
        message: `"${title}" set for ${formatTime(time)}`,
        buttons: [{ type: 'ok' }]
    });
    
    // Update main button
    updateMainButton();
}

// Delete a task
function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    tg.HapticFeedback.impactOccurred('medium');
    updateMainButton();
}

// Clear all tasks
function clearAllTasks() {
    if (tasks.length === 0) return;
    
    tg.showPopup({
        title: '⚠️ Clear All?',
        message: 'Are you sure you want to delete all reminders?',
        buttons: [
            { type: 'cancel' },
            { type: 'ok' }
        ]
    }, function(buttonIndex) {
        if (buttonIndex === 1) { // OK button
            tasks = [];
            saveTasks();
            renderTasks();
            tg.HapticFeedback.notificationOccurred('warning');
            updateMainButton();
        }
    });
}

// Render tasks to UI
function renderTasks() {
    if (tasks.length === 0) {
        taskListEl.innerHTML = `<p class="empty-message">No reminders yet. Add one above!</p>`;
        return;
    }
    
    // Sort by time (soonest first)
    const sorted = [...tasks].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    taskListEl.innerHTML = sorted.map(task => `
        <div class="task-item">
            <div class="task-info">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-time">⏰ ${formatTime(task.time)}</div>
            </div>
            <button class="delete-btn" data-id="${task.id}">✕</button>
        </div>
    `).join('');
    
    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTask(parseInt(this.dataset.id));
        });
    });
}

// ============================================================
// 5. UTILITY FUNCTIONS
// ============================================================

function formatTime(datetime) {
    if (!datetime) return 'No time set';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// 6. TELEGRAM MAIN BUTTON
// ============================================================

function updateMainButton() {
    if (tasks.length > 0) {
        tg.MainButton.setText(`📋 View ${tasks.length} Reminder${tasks.length > 1 ? 's' : ''}`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

tg.MainButton.onClick(function() {
    // Show all tasks in a popup
    if (tasks.length === 0) return;
    
    const taskList = tasks.map((t, i) => 
        `${i+1}. ${t.title} (${formatTime(t.time)})`
    ).join('\n');
    
    tg.showPopup({
        title: `📋 Your Reminders (${tasks.length})`,
        message: taskList,
        buttons: [{ type: 'close' }]
    });
});

// ============================================================
// 7. EVENT LISTENERS
// ============================================================

// Add task on button click
addTaskBtn.addEventListener('click', addTask);

// Add task on Enter key
taskTitleInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});

// Clear all tasks
clearAllBtn.addEventListener('click', clearAllTasks);

// ============================================================
// 8. LOAD INITIAL DATA
// ============================================================

loadTasks();
updateMainButton();

// Set default time to 1 hour from now
const now = new Date();
now.setHours(now.getHours() + 1);
taskTimeInput.value = now.toISOString().slice(0, 16);

console.log('✅ Task Reminder Mini App is ready!');