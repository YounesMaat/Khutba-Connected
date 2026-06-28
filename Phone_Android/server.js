const express = require("express");
const path = require('path');
const fs = require("fs");
const multer = require("multer");
const { exec } = require("child_process");
const os = require('os');
const cors = require('cors');
const Bonjour = require('bonjour-service').default;
const qrcode = require('qrcode-terminal');

const app = express();
const http = require("http").createServer(app);
const bonjour = new Bonjour();

app.use(cors());

const io = require("socket.io")(http, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling']
});

// --- CONFIGURATION PWA & COMPATIBILITÉ ---

// 1. Serveur du Service Worker (Doit être à la racine)
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('fetch', e => {
            // Indispensable pour l'installation sur iPhone/Android
            e.respondWith(fetch(e.request));
        });
    `);
});

// 2. Serveur du Manifeste
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "manifest.json"));
});

// FIXED: Headers pour navigateurs mobiles et Range Requests pour iPhone
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Accept-Ranges", "bytes"); 
    next();
});

const isPkg = typeof process.pkg !== 'undefined';
const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

const dataDir = path.join(baseDir, "data");
const externalUploadsDir = path.join(baseDir, "uploads");
const DB_FILE = path.join(dataDir, "khutbah.json");

[dataDir, externalUploadsDir, path.join(externalUploadsDir, "khutbahs"), path.join(externalUploadsDir, "audio")].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.static(path.join(__dirname, "public")));

// Serving statique optimisé pour l'audio (iOS)
app.use("/uploads", (req, res, next) => {
    res.set("Accept-Ranges", "bytes"); 
    next();
}, express.static(externalUploadsDir, {
    setHeaders: (res, path) => {
        if (path.endsWith('.wav')) res.set("Content-Type", "audio/wav");
        if (path.endsWith('.mp3')) res.set("Content-Type", "audio/mpeg");
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- LOGIQUE DE BASE DE DONNÉES ---

function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch { return []; }
}
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

let state = { khutbahId: null, page: 1 };

app.get("/list", (req, res) => res.json(loadDB()));

app.post("/start-khutbah", (req, res) => {
    const { id } = req.body;
    const db = loadDB();
    const khutbah = db.find(x => String(x.id) === String(id));
    if (!khutbah) return res.status(404).json({ error: "Not found" });
    state = { khutbahId: id, page: 1 };
    io.emit("play", { khutbahId: id, page: 1, audio: khutbah.audio?.["1"] || null });
    res.json({ ok: true });
});

const storageConfig = (folder) => multer.diskStorage({
    destination: path.join(externalUploadsDir, folder),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});
const uploadPDF = multer({ storage: storageConfig("khutbahs") });
const uploadAudio = multer({ storage: storageConfig("audio") });

app.post("/upload", uploadPDF.single("pdf"), (req, res) => {
    const db = loadDB();
    const item = { id: String(Date.now()), name: req.file.originalname, file: "/uploads/khutbahs/" + req.file.filename, audio: {}, status: "DRAFT", totalPages: null };
    db.push(item);
    saveDB(db);
    res.json(item);
});

app.post("/upload-audio", uploadAudio.single("audio"), (req, res) => {
    let { id, page, totalPages } = req.body;
    let db = loadDB();
    db = db.map(item => {
        if (String(item.id) === String(id)) {
            if (!item.audio) item.audio = {};
            item.audio[String(page)] = "/uploads/audio/" + req.file.filename;
            if (totalPages) item.totalPages = Number(totalPages);
        }
        return item;
    });
    saveDB(db);
    res.json({ ok: true });
});

app.post("/check-complete", (req, res) => {
    const { id } = req.body;
    const db = loadDB();
    const item = db.find(x => String(x.id) === String(id));
    if (!item) return res.json({ ok: false, done: 0, total: 0, missing: [] });
    const total = parseInt(item.totalPages) || 0;
    const missing = [];
    for (let i = 1; i <= total; i++) {
        if (!item.audio || !item.audio[String(i)]) missing.push(i);
    }
    res.json({
        ok: total > 0 && missing.length === 0,
        missing: missing,
        done: total - missing.length,
        total: total
    });
});

app.post("/mark-ready", (req, res) => {
  const { id } = req.body;
  let db = loadDB();
  db = db.map(item => {
    if (String(item.id) === String(id)) item.status = "READY";
    return item;
  });
  saveDB(db);
  res.json({ ok: true });
});

app.delete("/delete/:id", (req, res) => {
    saveDB(loadDB().filter(x => String(x.id) !== String(req.params.id)));
    res.json({ ok: true });
});

// --- SOCKET.IO ---

io.on("connection", (socket) => {
    const sendState = (target = socket) => {
        if (!state.khutbahId) return;
        const khutbah = loadDB().find(x => String(x.id) === String(state.khutbahId));
        if (khutbah) {
            target.emit("play", { khutbahId: state.khutbahId, page: state.page, audio: khutbah.audio[String(state.page)] || null });
        }
    };
    sendState();
    socket.on("getState", () => sendState(socket));
    socket.on("pageChange", ({ id, page }) => {
        state = { khutbahId: id, page };
        const khutbah = loadDB().find(x => String(x.id) === String(id));
        io.emit("play", { khutbahId: id, page, audio: khutbah?.audio[String(page)] || null });
    });
});

// --- HELPER TO GET NETWORK IP ---
function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const PORT = 3000;
const IP_ADDR = getNetworkIP();
const LISTENER_URL = `http://${IP_ADDR}:${PORT}`;

// --- DÉMARRAGE ---

http.listen(PORT, "0.0.0.0", () => {
    bonjour.publish({ name: 'Jumuaa Server', type: 'http', port: PORT });
    
    console.log(`\n🚀 Serveur Actif sur le réseau !`);
    console.log(`-------------------------------------------`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`Listener Link: ${LISTENER_URL}`);
    console.log(`-------------------------------------------\n`);

    // Génération du QR Code intelligent (Redirect to Chrome for Android intents)
    // Note: Pour forcer Chrome sur Android dès le scan, on peut utiliser le format Intent
    const chromeIntentUrl = `http://${IP_ADDR}:${PORT}`;
    
    
    console.log("Scannez ce code pour rejoindre (Android forcera Chrome) :");
    qrcode.generate(chromeIntentUrl, {small: true});

    // Auto-open Admin Panel
    const adminUrl = `http://localhost:${PORT}/admin.html`;
    const cmd = process.platform === 'win32' ? `start chrome --app=${adminUrl}` : `open ${adminUrl}`;
    exec(cmd, (err) => { if (err) exec(process.platform === 'win32' ? `start ${adminUrl}` : `open ${adminUrl}`); });
});
