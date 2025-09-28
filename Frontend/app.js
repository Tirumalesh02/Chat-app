const socket = io();
let currentUserId = null;
let currentUserName = '';
const groupId = 'Internships Talk'; 


let isAnonymous = true;
const chatMessages = document.querySelector('.chat-messages');
const messageInput = document.querySelector('.input-area input[type="text"]');
const sendButton = document.querySelector('.send-button');
const anonymousToggleText = document.querySelector('.anonymous-toggle');
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');


document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Authenticate: get current user
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { window.location.href = '/login'; return; }
        const me = await res.json();
        currentUserId = me.id;
        currentUserName = me.name || me.email || 'You';
    } catch (e) {
        window.location.href = '/login';
        return;
    }

    // Join socket group now that we have user
    socket.emit('joinGroup', { groupId: groupId, userId: currentUserId });

    // Pull user prefs from server (theme, isAnonymous)
    fetch(`/api/prefs/${currentUserId}`)
        .then(r => r.ok ? r.json() : {})
        .then(prefs => {
            if (prefs.theme) setTheme(prefs.theme);
            if (typeof prefs.isAnonymous === 'boolean') {
                isAnonymous = prefs.isAnonymous;
            }
            updateAnonymousToggleText();
        })
        .catch(() => { updateAnonymousToggleText(); });

    updateAnonymousToggleText();


    sendButton.addEventListener('click', sendMessage);
    // Use keydown for reliable Enter detection and prevent default
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    anonymousToggleText.addEventListener('click', toggleAnonymousMode);
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    fetchHistoryMessages(); 
});


function sendMessage() {
    const content = messageInput.value.trim();
    if (content === '' || !currentUserId) return;

    const messageData = {
        groupId: groupId,
        senderId: currentUserId,
        senderName: currentUserName,
        content: content,
        isAnonymous: isAnonymous,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

   
    socket.emit('sendMessage', messageData);

    addMessageToUI(messageData, true); 

   
    messageInput.value = '';
    scrollToBottom();
}

socket.on('receiveMessage', (messageData) => {
    
    if (messageData.senderId !== currentUserId) {
        addMessageToUI(messageData, false); // false for isCurrentUser
        scrollToBottom();
    }
});

function addMessageToUI(msg, isCurrentUser) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    messageEl.classList.add(isCurrentUser ? 'outgoing' : 'incoming');
    
   
    if (!isCurrentUser) {
        messageEl.classList.add(msg.isAnonymous ? 'anonymous' : 'named-user');
    }
    let senderDisplay = msg.senderName;
    if (msg.isAnonymous && !isCurrentUser) {
        senderDisplay = 'Anonymous';
    }

    
    messageEl.innerHTML = `
        ${!isCurrentUser && msg.isAnonymous ? '<span class="profile-placeholder"></span>' : ''}
    ${!isCurrentUser && !msg.isAnonymous ? '<img src="assets/avatar_default.svg" alt="" class="profile-picture">' : ''}
        
        <div class="message-content">
            ${!isCurrentUser && !msg.isAnonymous ? `<div class="sender-name">${senderDisplay}</div>` : ''}
            <div class="text">${msg.content}</div>
            <div class="timestamp">${msg.timestamp}
                ${isCurrentUser ? '<span class="read-receipt">✓✓</span>' : ''}
            </div>
        </div>
    `;


    if (isCurrentUser && msg.content.toLowerCase().includes('not attending')) {
         messageEl.classList.add('red-bubble');
    }

    chatMessages.appendChild(messageEl);
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function fetchHistoryMessages() {
    fetch(`/api/messages/${encodeURIComponent(groupId)}`)
        .then(r => r.json())
        .then(list => {
            list.forEach(msg => addMessageToUI(msg, msg.senderId === currentUserId));
            scrollToBottom();
        })
        .catch(err => console.error('History load failed', err));
}

function toggleAnonymousMode() {
    
    isAnonymous = !isAnonymous;

    updateAnonymousToggleText();
    socket.emit('updateAnonStatus', { userId: currentUserId, isAnonymous: isAnonymous });
    // Persist to backend
    fetch(`/api/prefs/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnonymous })
    }).catch(() => {});
}


function updateAnonymousToggleText() {
    if (isAnonymous) {
        anonymousToggleText.innerHTML = `
            <span class="icon">&#x1f697;</span>
            Now you're appearing as <strong>Anonymous</strong>!
            <span class="icon">&#x1f697;</span>
        `;
        // rely on CSS variables for theme colors
    } else {
        anonymousToggleText.innerHTML = `
            <span class="icon">&#x1f464;</span>
            You're appearing as <strong>${currentUserName || 'You'}</strong>. Click to go anonymous.
            <span class="icon">&#x1f464;</span>
        `;
        // rely on CSS variables for theme colors
    }
}

function setTheme(mode) {
    document.body.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('theme', mode);
    if (themeIcon) {
        if (mode === 'dark') {
            // show sun with light stroke for dark background
            themeIcon.src = 'assets/icon_sun_dark.svg';
            themeIcon.alt = 'Switch to light mode';
            themeIcon.title = 'Light mode';
        } else {
            // show moon with dark stroke for light background
            themeIcon.src = 'assets/icon_moon_light.svg';
            themeIcon.alt = 'Switch to dark mode';
            themeIcon.title = 'Dark mode';
        }
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
    // Persist to backend
    fetch(`/api/prefs/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newMode })
    }).catch(() => {});
}