const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesList = document.getElementById('filesList');
const processButton = document.getElementById('processButton');
const notification = document.getElementById('notification');
const googleSheetsLink = document.getElementById('googleSheetsLink');
const projectSelect = document.getElementById('projectSelect');

const files = new Map();
let currentSessionId = null;
const selectedProject = { id: null, name: null }; // Store both ID and name

// Fetch environment settings including Google Sheets URL
async function fetchEnvironmentSettings() {
    try {
        const response = await fetch('/api/environment');
        if (!response.ok) throw new Error('Failed to fetch environment settings');
        
        const data = await response.json();
        if (data.googleSheetsUrl) {
            googleSheetsLink.href = data.googleSheetsUrl;
            console.log('Google Sheets URL set:', data.googleSheetsUrl);
        }
    } catch (error) {
        console.error('Error fetching environment settings:', error);
    }
}

// Initialize environment settings
fetchEnvironmentSettings();

// Fetch projects from API
async function fetchProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        
        const projects = await response.json();
        populateProjectsDropdown(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        showNotification('Ошибка при загрузке проектов', 'error');
    }
}

// Populate projects dropdown
function populateProjectsDropdown(projects) {
    // Clear current options except the placeholder
    while (projectSelect.options.length > 1) {
        projectSelect.remove(1);
    }
    
    // Add project options
    for (const project of projects) {
        const option = document.createElement('option');
        option.value = project['No.'];
        option.textContent = `${project['No.']} - ${project['Project Name']}`;
        // Store project name as a data attribute
        option.dataset.projectName = project['Project Name'];
        projectSelect.appendChild(option);
    }
    
    // Update placeholder
    projectSelect.options[0].textContent = projects.length > 0 
        ? 'Выберите проект' 
        : 'Нет доступных проектов';
}

// Handle project selection
projectSelect.addEventListener('change', (event) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    selectedProject.id = event.target.value;
    selectedProject.name = selectedOption.dataset.projectName;
    console.log('Selected project:', { id: selectedProject.id, name: selectedProject.name });
});

// Initialize projects
fetchProjects();

// WebSocket connection
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

ws.onopen = () => {
    console.log('WebSocket connected');
};

ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Try to reconnect in 5 seconds
    setTimeout(() => {
        window.location.reload();
    }, 5000);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'processingComplete':
            if (message.sessionId === currentSessionId) {
                showNotification('Все файлы обработаны', 'success');
                files.clear();
                updateFilesList();
                updateProcessButton();
                currentSessionId = null;
            }
            break;
            
        default:
            console.log('Unknown message type:', message.type);
    }
};

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(fileList) {
    for (const file of fileList) {
        if (validateFile(file)) {
            files.set(file.name, {
                file: file,
                status: 'готов'
            });
        }
    }
    updateFilesList();
    updateProcessButton();
}

function validateFile(file) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
        showNotification('Допустимы только файлы Word и PDF', 'error');
        return false;
    }

    if (file.size > maxSize) {
        showNotification('Размер файла не должен превышать 10MB', 'error');
        return false;
    }

    return true;
}

function updateFilesList() {
    filesList.innerHTML = '';
    files.forEach((fileData, fileName) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = fileName;
        
        const statusSpan = document.createElement('span');
        statusSpan.className = `file-status ${fileData.status === 'обработан' ? 'success' : ''}`;
        statusSpan.textContent = fileData.status;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-file';
        removeButton.textContent = '✕';
        removeButton.onclick = () => removeFile(fileName);
        
        fileItem.appendChild(nameSpan);
        fileItem.appendChild(statusSpan);
        fileItem.appendChild(removeButton);
        filesList.appendChild(fileItem);
    });
}

function removeFile(fileName) {
    files.delete(fileName);
    updateFilesList();
    updateProcessButton();
}

function updateProcessButton() {
    processButton.disabled = files.size === 0;
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.classList.add('hiding');
        notification.addEventListener('animationend', function hideNotification() {
            notification.style.display = 'none';
            notification.classList.remove('hiding');
            notification.removeEventListener('animationend', hideNotification);
        });
    }, 3000);
}

processButton.addEventListener('click', async () => {
    if (!selectedProject.name) {
        showNotification('Пожалуйста, выберите проект', 'error');
        return;
    }

    const formData = new FormData();
    files.forEach((fileData, fileName) => {
        formData.append('files', fileData.file);
    });
    
    // Add the project name to the form data
    formData.append('projectName', selectedProject.name);

    processButton.disabled = true;
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Ошибка при отправке файлов');
        }

        const result = await response.json();
        currentSessionId = result.sessionId;
        console.log('Upload successful, session ID:', currentSessionId);

        // Update status for all files
        files.forEach((fileData, fileName) => {
            fileData.status = 'обрабатывается';
        });
        updateFilesList();
        
        showNotification('Файлы загружены и обрабатываются', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(error.message, 'error');
        processButton.disabled = false;
    }
});
