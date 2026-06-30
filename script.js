const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('user-greeting').textContent = 
        `Welcome, ${user.first_name}! 👋`;
}

let tasks = [];

function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        tasks = JSON.parse(saved);
        renderTasks();
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

const taskTitleInput = document.getElementById('task-title');
const taskDateInput = document.getElementById('task-date');
const taskTimeInput = document.getElementById('task-time');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListEl = document.getElementById('task-list');
const clearAllBtn = document.getElementById('clear-all-btn');

const BACKEND_URL = 'https://tg-win-mini-app-test.onrender.com/api/tasks';

function saveTasksToBackend() {
    fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            tasks: tasks,
            initData: tg.initData
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Tasks synced with backend:', data);
    })
    .catch(error => {
        console.error('❌ Error syncing tasks:', error);
    });
}

function loadTasksFromBackend() {
    fetch(`${BACKEND_URL}?initData=${encodeURIComponent(tg.initData)}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.tasks && data.tasks.length > 0) {
            tasks = data.tasks;
            saveTasks();
            renderTasks();
            updateMainButton();
            console.log('✅ Tasks loaded from backend');
        } else {
            loadTasks();
        }
    })
    .catch(error => {
        console.error('❌ Error loading tasks from backend:', error);
        loadTasks();
    });
}

function addTask() {
    const title = taskTitleInput.value.trim();
    const date = taskDateInput.value;
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
    
    if (!date) {
        tg.showPopup({
            title: 'Missing Info',
            message: 'Please select a date.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!time) {
        tg.showPopup({
            title: 'Missing Info',
            message: 'Please select a time.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Combine date and time into one datetime string
    const datetime = `${date}T${time}:00`;
    
    const task = {
        id: Date.now(),
        title: title,
        time: datetime,
        date: date,
        timeOnly: time,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    saveTasksToBackend();
    
    // Clear inputs
    taskTitleInput.value = '';
    taskDateInput.value = '';
    taskTimeInput.value = '';
    
    tg.HapticFeedback.notificationOccurred('success');
    tg.showPopup({
        title: '✅ Reminder Added!',
        message: `"${title}" set for ${formatDate(date)} at ${time}`,
        buttons: [{ type: 'ok' }]
    });
    
    updateMainButton();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    saveTasksToBackend();
    tg.HapticFeedback.impactOccurred('medium');
    updateMainButton();
}

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
        if (buttonIndex === 1) {
            tasks = [];
            saveTasks();
            renderTasks();
            saveTasksToBackend();
            tg.HapticFeedback.notificationOccurred('warning');
            updateMainButton();
        }
    });
}

function renderTasks() {
    if (tasks.length === 0) {
        taskListEl.innerHTML = `<p class="empty-message">No reminders yet. Add one above!</p>`;
        return;
    }
    
    const sorted = [...tasks].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    taskListEl.innerHTML = sorted.map(task => `
        <div class="task-item">
            <div class="task-info">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-time">📅 ${formatDate(task.date)} at ${task.timeOnly || formatTime(task.time)}</div>
            </div>
            <button class="delete-btn" data-id="${task.id}">✕</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTask(parseInt(this.dataset.id));
        });
    });
}

function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    const parts = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
}

function formatTime(datetime) {
    if (!datetime) return 'No time set';
    const date = new Date(datetime);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateMainButton() {
    if (tasks.length > 0) {
        tg.MainButton.setText(`📋 View ${tasks.length} Reminder${tasks.length > 1 ? 's' : ''}`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

tg.MainButton.onClick(function() {
    if (tasks.length === 0) return;
    
    const taskList = tasks.map((t, i) => 
        `${i+1}. ${t.title} (${formatDate(t.date)} at ${t.timeOnly || formatTime(t.time)})`
    ).join('\n');
    
    tg.showPopup({
        title: `📋 Your Reminders (${tasks.length})`,
        message: taskList,
        buttons: [{ type: 'close' }]
    });
});

addTaskBtn.addEventListener('click', addTask);
taskTitleInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});
clearAllBtn.addEventListener('click', clearAllTasks);

loadTasksFromBackend();

// Set default date to today
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
taskDateInput.value = `${year}-${month}-${day}`;

// Set default time to 1 hour from now
const now = new Date();
now.setHours(now.getHours() + 1);
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
taskTimeInput.value = `${hours}:${minutes}`;

console.log('✅ Task Reminder Mini App is ready!');
