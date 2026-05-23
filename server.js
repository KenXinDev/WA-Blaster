const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const path = require('path');

// route homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    console.log('Scan QR ini:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WA Ready!');
});

client.initialize();

// API kirim pesan
app.post('/send', async (req, res) => {
    const { numbers, message } = req.body;

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const chatId = number + "@c.us";

        await client.sendMessage(chatId, message);

        // delay random 20–40 detik
        const delay = Math.floor(Math.random() * 20000) + 20000;
        await new Promise(r => setTimeout(r, delay));
    }

    res.send("Selesai kirim");
});

app.listen(3000, () => {
    console.log('Server jalan di http://localhost:3000');
});