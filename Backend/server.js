
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('./db/db');
const store = require('./store');
const { router: authRouter, COOKIE_NAME, JWT_SECRET } = require('./routes/auth');
const { router: messagesRouter } = require('./routes/messages');
const { router: prefsRouter } = require('./routes/prefs');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);


const ALLOWED_ORIGINS = [
	'http://localhost:3000',
	'http://127.0.0.1:3000',
	'http://localhost:5500',
	'http://127.0.0.1:5500'
];


app.use(cors({
	origin: ALLOWED_ORIGINS,
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type'],
	credentials: true,
}));
app.use(cookieParser());
app.use(express.json());


const publicDir = path.join(__dirname, '..', 'Frontend');
app.use(express.static(publicDir, { maxAge: '1h', etag: true }));

const io = new Server(server, {
	cors: {
		origin: ALLOWED_ORIGINS,
		methods: ['GET', 'POST'],
		credentials: true,
	}
});

let groupMessages = store.messages; 
let userPrefs = store.prefs;        

io.on('connection', (socket) => {
	// Authenticate socket using JWT cookie
	try {
		const rawCookie = socket.request.headers.cookie || '';
		const pairs = rawCookie.split(';').map(c => c.trim()).filter(Boolean);
		const cookies = Object.fromEntries(pairs.map(c => {
			const idx = c.indexOf('=');
			return [c.substring(0, idx), c.substring(idx + 1)];
		}));
		const token = cookies[COOKIE_NAME];
		const payload = jwt.verify(decodeURIComponent(token || ''), JWT_SECRET);
		socket.user = payload; // { id, name, email }
	} catch (e) {
		socket.disconnect(true);
		return;
	}

	
	socket.on('joinGroup', ({ groupId }) => {
		socket.join(groupId);
	});


	socket.on('sendMessage', async (msg) => {
		try {
			const { groupId } = msg;
			if (!groupId) return;
			const payloadMsg = {
				groupId,
				senderId: socket.user.id,
				senderName: socket.user.name || msg.senderName || 'User',
				content: String(msg.content || ''),
				isAnonymous: !!msg.isAnonymous,
				timestamp: msg.timestamp || new Date().toISOString(),
			};
			
			await Message.create(payloadMsg);
			
			socket.to(groupId).emit('receiveMessage', payloadMsg);
		} catch (e) {
			
		}
	});

	
	socket.on('updateAnonStatus', async ({ userId, isAnonymous }) => {
		try {
			const uid = socket.user.id;
			if (!uid) return;
			await User.findByIdAndUpdate(uid, { isAnonymous: !!isAnonymous });
		} catch (e) {}
	});
});


app.get('/', (req, res) => {
	const token = req.cookies[COOKIE_NAME];
	if (!token) return res.sendFile(path.join(publicDir, 'login.html'));
	try {
		jwt.verify(token, JWT_SECRET);
		return res.sendFile(path.join(publicDir, 'index.html'));
	} catch (e) {
		return res.sendFile(path.join(publicDir, 'login.html'));
	}
});

app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(publicDir, 'signup.html')));

// API Routers
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/prefs', prefsRouter);

const PORT = 3000;

server.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
