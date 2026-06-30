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
    const time = taskTimeInput.value;
    
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
    
    const task = {
        id: Date.now(),
        title: title,
        time: time,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    saveTasksToBackend();
    
    taskTitleInput.value = '';
    taskTimeInput.value = '';
    
    tg.HapticFeedback.notificationOccurred('success');
    tg.showPopup({
        title: '✅ Reminder Added!',
        message: `"${title}" set for ${formatTime(time)}`,
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
                <div class="task-time">⏰ ${formatTime(task.time)}</div>
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
        `${i+1}. ${t.title} (${formatTime(t.time)})`
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

const now = new Date();
now.setHours(now.getHours() + 1);
taskTimeInput.value = now.toISOString().slice(0, 16);

console.log('✅ Task Reminder Mini App is ready!');
