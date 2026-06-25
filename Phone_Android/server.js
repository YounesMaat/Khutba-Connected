const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const os = require('os');
const Bonjour = require('bonjour-service').default;
const qrcode = require("qrcode-terminal");
const socketio = require("socket.io");
const { OpenAI } = require("openai");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");


ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const server = http.createServer(app);
const bonjour = new Bonjour();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const CONFIG_FILE = path.join(__dirname, 'config.json');

// Helper to load key on server startup
let savedApiKey = "";
let openAIClient = null;
if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    savedApiKey = config.apiKey || "";
}

function getSavedKey() {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
        return config.apiKey || "";
    }
    return "";
}

// Endpoint to save key
app.post("/config/save", (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.startsWith("sk-")) {
        return res.status(400).json({ error: "Invalid API key" });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }));

    savedApiKey = apiKey;
    openAIClient = new OpenAI({ apiKey });

    res.json({ ok: true });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new socketio.Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling']
});


const getOpenAIClient = (apiKey) => {
    return new OpenAI({ apiKey: apiKey });
};

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('fetch', e => {
            e.respondWith(fetch(e.request));
        });
    `);
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "manifest.json"));
});

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

const khutbahsDir = path.join(externalUploadsDir, "khutbahs");
const audioDir = path.join(externalUploadsDir, "audio");

[dataDir, externalUploadsDir, khutbahsDir, audioDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", (req, res, next) => {
    res.set("Accept-Ranges", "bytes"); 
    next();
}, express.static(externalUploadsDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.wav')) res.set("Content-Type", "audio/wav");
        if (filePath.endsWith('.mp3')) res.set("Content-Type", "audio/mpeg");
    }
}));

let preparedState = { khutbahId: null, page: 1 };
let liveAI = { active: false };
let processing = false;
const queue = [];
let lastWhisperText = ""; 

let imamInfo = {
    countryCode: "ma",
    dialect: "Moroccan Darija"
};

// Persistent object tracking raw text fragments waiting for completion per destination target language channel
let carryOverBuffersByLang = {};

let arabicTextBuffer = ""; 
const WORD_THRESHOLD = 5; 

// Dynamic tracked configs
let activeLanguages = new Set();
let khutbahSourceLanguage = "ar"; // Tracked runtime source language configured by the Imam

function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch { return []; }
}
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

const storageConfig = (folder) => multer.diskStorage({
    destination: path.join(externalUploadsDir, folder),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});

const uploadPDF = multer({ storage: storageConfig("khutbahs") });
const uploadAudio = multer({ storage: storageConfig("audio") });
const liveMemoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

function removeOverlap(previousText, currentText) {
    if (!previousText) return currentText;

    const prevWords = previousText.trim().split(/\s+/);
    const currWords = currentText.trim().split(/\s+/);
    const maxOverlap = Math.min(prevWords.length, currWords.length);

    for (let i = maxOverlap; i > 0; i--) {
        const prevTail = prevWords.slice(-i).join(" ");
        const currHead = currWords.slice(0, i).join(" ");

        if (prevTail === currHead) {
            console.log(`✂️ Deduplication Engine: Removed ${i} overlapping word(s): "${currHead}"`);
            return currWords.slice(i).join(" ");
        }
    }
    return currentText;
}

function countWords(str) {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function recalculateActiveLanguages() {
    const currentLangs = new Set();
    const clients = io.sockets.adapter.rooms;
    for (const [roomId, room] of clients.entries()) {
        if (roomId.startsWith("lang_") && !roomId.endsWith("_none")) {
            const lang = roomId.replace("lang_", "");
            if (room.size > 0 && lang !== "none") {
                currentLangs.add(lang);
            }
        }
    }
    activeLanguages = currentLangs;
    console.log("👥 Active requested target pipelines:", Array.from(activeLanguages));
}

// ==========================================
// ENDPOINTS: PREPARED KHUTBAH MODE
// ==========================================
app.get("/list", (req, res) => res.json(loadDB()));

const dialectMap = {
    ma: { country: "Morocco", dialect: "Moroccan Darija" },
    dz: { country: "Algeria", dialect: "Algerian Arabic (Darja)" },
    tn: { country: "Tunisia", dialect: "Tunisian Arabic" },
    ly: { country: "Libya", dialect: "Libyan Arabic" },
    eg: { country: "Egypt", dialect: "Egyptian Arabic" },
    sa: { country: "Saudi Arabia", dialect: "Gulf Arabic" },
    ae: { country: "UAE", dialect: "Gulf Arabic" },
    jo: { country: "Jordan", dialect: "Levantine Arabic" },
    ps: { country: "Palestine", dialect: "Levantine Arabic" },
    sy: { country: "Syria", dialect: "Levantine Arabic" },
    iq: { country: "Iraq", dialect: "Iraqi Arabic" }
};


app.post("/start-khutbah", (req, res) => {
    const { id } = req.body;
    const db = loadDB();
    const khutbah = db.find(x => String(x.id) === String(id));
    if (!khutbah) return res.status(404).json({ error: "Not found" });
    
    if (liveAI.active) {
        liveAI.active = false;
        io.emit("live-status", { active: false });
    }

    preparedState = { khutbahId: id, page: 1 };
    io.emit("play", { khutbahId: id, page: 1, audio: khutbah.audio?.["1"] || null });
    res.json({ ok: true });
});

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

// ==========================================
// ENDPOINTS: LIVE STREAM MODE
// ==========================================
// ==========================================
// ENDPOINTS: LIVE STREAM MODE
// ==========================================
app.post("/live/start", (req, res) => {
    let userKey = req.headers['x-openai-key'] || getSavedKey();

    console.log("Key preview:", userKey ? userKey.substring(0, 7) + "..." : "EMPTY");

    if (!userKey || !userKey.startsWith("sk-")) {
        return res.status(401).json({ error: "API Key required." });
    }

    liveAI.apiKey = userKey;
    openAIClient = new OpenAI({ apiKey: userKey });
    liveAI.active = true;

    arabicTextBuffer = "";
    lastWhisperText = "";
    carryOverBuffersByLang = {};
    preparedState = { khutbahId: null, page: 1 };

    io.emit("live-status", { active: true });

    console.log("🔥 LIVE STARTED");
    res.json({ ok: true });
});


app.post("/live/stop", (req, res) => {
    liveAI.active = false;
    io.emit("live-status", { active: false });
    console.log("⛔ LIVE STOPPED");
    res.json({ ok: true });
});

app.post("/live/chunk", liveMemoryUpload.single("audio"), async (req, res) => {
    if (!liveAI.active) return res.json({ ok: false, error: "Not active" });
    if (!req.file || req.file.size < 3000) return res.json({ ok: false, error: "Empty chunk" });

    // Added safety: Prevent memory overflow
    if (queue.length > 15) queue.shift();

    queue.push(req.file.buffer);
    res.json({ ok: true });
    processQueue();
});

// ==========================================
// UNIFIED PARALLEL TARGET PROCESSING PIPELINE
// ==========================================
async function processQueue() {
    if (processing || queue.length === 0) return;
    processing = true;

    const client = new OpenAI({ apiKey: liveAI.apiKey });

    recalculateActiveLanguages();

    const mapSourceToTargetValue = {
        ar: "arabic",
        en: "english",
        fr: "french",
        es: "spanish",
        de: "german",
        nl: "dutch"
    };

    const mapTargetToCode = {
        arabic: "ar",
        english: "en",
        french: "fr",
        spanish: "es",
        german: "de",
        dutch: "nl"
    };

    const mapSourceToText = {
        ar: "Arabic",
        en: "English",
        fr: "French",
        es: "Spanish",
        de: "German",
        nl: "Dutch"
    };

  const imamDialect = imamInfo?.dialect || "none";


    const imamTargetValue = mapSourceToTargetValue[khutbahSourceLanguage];

    const countryCode = imamInfo?.countryCode || "ma";

    const dialectContext =
        dialectMap?.[countryCode]?.dialect ||
        "Modern Standard Arabic (MSA)";

    console.log(`🕌 Dialect Context Active: ${dialectContext} (${countryCode})`);


    let dialectPrompt = "";

    if (khutbahSourceLanguage === "ar") {

        if (!imamDialect || imamDialect === "none") {
            dialectPrompt = "Primary language is Arabic with no dialect bias. Use neutral Modern Standard Arabic understanding.";
        } else {
            dialectPrompt = `Primary language is Arabic with possible influence from ${dialectContext}. Correct ASR using that context.`;
        }

    } else {
        dialectPrompt = "";
    }

    if (activeLanguages.size === 0) {
        console.log(`⏸️ No active listeners. Skipping pipeline.`);
        queue.length = 0;
        processing = false;
        return;
    }

    const needsTranslation = Array.from(activeLanguages).some(
        lang => lang !== imamTargetValue
    );

    if (!needsTranslation) {
        console.log(`⏸️ All listeners match source language. Skipping pipeline.`);
        queue.length = 0;
        processing = false;
        return;
    }

    const buffer = queue.shift();
    const id = Date.now() + "_" + Math.random().toString(16).slice(2);

    const webmPath = path.join(__dirname, `tmp_${id}.webm`);
    const wavPath = path.join(__dirname, `tmp_${id}.wav`);

    let chunkTimeoutId = null;

    try {
        fs.writeFileSync(webmPath, buffer);

        const timeoutPromise = new Promise((_, reject) => {
            chunkTimeoutId = setTimeout(() => {
                reject(new Error("Chunk processing timed out"));
            }, 15000);
        });

        await Promise.race([
            (async () => {

                console.log("🔄 Audio preprocessing...");

                await new Promise((resolve, reject) => {
                    ffmpeg(webmPath)
                        .audioFilters([
                            "highpass=f=100",
                            "lowpass=f=3000",
                            "volume=1.5"
                        ])
                        .audioChannels(1)
                        .audioFrequency(16000)
                        .format("wav")
                        .on("end", resolve)
                        .on("error", reject)
                        .save(wavPath);
                });

                if (!fs.existsSync(wavPath)) return;

                const wavBuffer = fs.readFileSync(wavPath);
                const pcmData = wavBuffer.subarray(44);

                let sum = 0;
                let samples = pcmData.length / 2;

                for (let i = 0; i < pcmData.length; i += 2) {
                    const sample = pcmData.readInt16LE(i) / 32768;
                    sum += sample * sample;
                }

                const rms = Math.sqrt(sum / samples);

                console.log(`📊 RMS: ${rms.toFixed(5)}`);

                if (rms < 0.03) {
                    console.log("🤫 Silent chunk skipped");
                    return;
                }

                console.log(`🧠 Whisper (${khutbahSourceLanguage})`);

                const ar = await client.audio.transcriptions.create({
                    model: "whisper-1",
                    file: fs.createReadStream(wavPath),
                    language: khutbahSourceLanguage
                });

                const rawText = ar.text?.trim();

                if (!rawText || rawText.length < 3) {
                    console.log("⚠️ empty whisper output");
                    return;
                }

                console.log(`🎤 Whisper: ${rawText}`);

                const blacklist = [
                    "اشتركوا في القناة",
                    "subscribe to the channel",
                    "like and subscribe",
                    "لا تنسوا الاشتراك",
                    "share and subscribe"
                ];

                const isHallucination = blacklist.some(p =>
                    rawText.toLowerCase().includes(p.toLowerCase())
                );

                if (isHallucination) {
                    console.log("🚫 Whisper hallucination detected, skipping chunk");
                    return;
                }

                const uniqueText = removeOverlap(lastWhisperText, rawText);
                lastWhisperText = rawText;

                if (!uniqueText) return;

                arabicTextBuffer += (arabicTextBuffer ? " " : "") + uniqueText;

                const wordCount = countWords(arabicTextBuffer);

                console.log(`📝 buffer: ${wordCount}`);

                if (wordCount < WORD_THRESHOLD) {
                    console.log(`⏳ Waiting for more words...`);
                    return;
                }

                const textToTranslate = arabicTextBuffer;
                arabicTextBuffer = "";

                await Promise.all(
                    Array.from(activeLanguages).map(async (lang) => {

                        const targetCode = mapTargetToCode[lang];
                        if (targetCode === khutbahSourceLanguage) {
                            console.log(`⚡ skip ${lang}`);
                            return;
                        }

                        try {
                            carryOverBuffersByLang[lang] ||= "";

                            const input = (carryOverBuffersByLang[lang] + " " + textToTranslate).trim();

                            console.log(`🌍 [${lang}] LLM segmentation...`);

                            const isArabicSource = khutbahSourceLanguage === "ar";

                            const dialectPrompt = isArabicSource
                                ? `Primary language is Modern Standard Arabic (MSA), but speech may be influenced by dialect: ${dialectContext} (imam origin).`
                                : ``;

                            const res = await client.chat.completions.create({
                                model: "gpt-5.4",
                                response_format: { type: "json_object" },
                                messages: [
                                    {
                                        role: "system",
                                        content:
`You are a real-time Islamic khutbah speech translation module.

${dialectPrompt}

Input is ASR output with possible errors, repetitions, and hallucinations. Remove noise (e.g. “subscribe”, irrelevant phrases) and correct transcription errors using context.

Task:
1) Reconstruct intended meaning.
2) Split into:
   - translation: complete sentences translated into "${lang}"
   - incomplete_phrase: trailing fragment (keep original language)

Rules:
- JSON only
- Do not translate incomplete_phrase
- Preserve religious meaning
- If no full sentence: translation = ""
- If clean end: incomplete_phrase = ""
{ "translation": "...", "incomplete_phrase": "..." }`
                                    },
                                    { role: "user", content: input }
                                ]
                            });

                            const json = JSON.parse(res.choices[0].message.content);

                            const translated = (json.translation || "").trim();
                            const fragment = (json.incomplete_phrase || "").trim();

                            console.log(`📦 fragment cache [${lang}]: "${fragment}"`);

                            if (fragment && fragment.length > 2 && fragment.length < 80) {
                                carryOverBuffersByLang[lang] = fragment;
                            }

                            if (!translated || translated.length < 3) {
                                console.log(`⏳ no full sentence yet [${lang}]`);
                                return;
                            }

                            console.log(`🎤 Traslation to [${lang}]: ${translated}`);

                            console.log(`🔊 TTS [${lang}]`);

                            const speech = await client.audio.speech.create({
                                model: "tts-1",
                                voice: "alloy",
                                input: translated
                            });

                            const fileName = `live_${lang}_${id}.mp3`;
                            const filePath = path.join(audioDir, fileName);

                            fs.writeFileSync(filePath, Buffer.from(await speech.arrayBuffer()));

                            io.to(`lang_${lang}`).emit("live-audio", {
                                audio: "/uploads/audio/" + fileName,
                                text: translated,
                                ts: Date.now()
                            });

                            console.log(`📡 sent -> ${lang}`);

                        } catch (e) {
                            console.error(`❌ [${lang}] error:`, e.message);
                        }
                    })
                );

            })(),
            timeoutPromise
        ]);

    } catch (err) {
        console.error(`🔥 ERROR: ${err.message}`);
    } finally {
        if (chunkTimeoutId) clearTimeout(chunkTimeoutId);

        [webmPath, wavPath].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        processing = false;
        setImmediate(processQueue);
    }
}

// ==========================================
// SOCKET.IO INTERACTION LOGIC
// ==========================================
io.on("connection", (socket) => {
    console.log("👤 Listener linked");

    // NOTE:
    // DO NOT keep imamInfo per socket.
    // It MUST be global (processQueue uses it)

    socket.emit("live-status", { active: liveAI.active });

    socket.emit("khutbah-source-sync", khutbahSourceLanguage);

    // =========================
    // IMAM INFO SYNC (NEW FIX)
    // =========================
    socket.on("imam-info", (info) => {
        console.log("🕌 Imam info received:", info);

        imamInfo = {
            countryCode: info.countryCode || "ma"
        };

        dialectContext =
            dialectMap[imamInfo.countryCode]?.dialect ||
            "Modern Standard Arabic (MSA)";

        console.log(`🌍 Dialect updated globally: ${dialectContext} (${imamInfo.countryCode})`);

        io.emit("imam-info", imamInfo);
    });

    // =========================
    // KHUTBAH SOURCE LANGUAGE
    // =========================
    socket.on("khutbah-source-change", (sourceLanguage) => {
        const supportedSources = ["ar", "en", "fr", "es", "de", "nl"];

        if (supportedSources.includes(sourceLanguage)) {
            khutbahSourceLanguage = sourceLanguage;

            console.log(`🕌 Imam changed Khutbah vocal language to: [${khutbahSourceLanguage.toUpperCase()}]`);

            io.emit("khutbah-source-sync", khutbahSourceLanguage);
        }
    });

    // =========================
    // TARGET LANGUAGE JOIN
    // =========================
    socket.on("select-language", (targetLanguage) => {
        const supported = ["arabic", "english", "spanish", "french", "german", "dutch", "none"];

        if (!supported.includes(targetLanguage)) return;

        supported.forEach(lang => socket.leave(`lang_${lang}`));

        socket.join(`lang_${targetLanguage}`);

        console.log(`🌐 Socket registered inside audio translation distribution cell: lang_${targetLanguage}`);

        recalculateActiveLanguages();
    });

    // =========================
    // PREPARED STATE SYNC
    // =========================
    const sendPreparedState = (target = socket) => {
        if (!preparedState.khutbahId) return;

        const khutbah = loadDB().find(x => String(x.id) === String(preparedState.khutbahId));

        if (khutbah) {
            target.emit("play", {
                khutbahId: preparedState.khutbahId,
                page: preparedState.page,
                audio: khutbah.audio[String(preparedState.page)] || null
            });
        }
    };

    sendPreparedState();

    socket.on("getState", () => sendPreparedState(socket));

    // =========================
    // PAGE CONTROL (LIVE SYNC)
    // =========================
    socket.on("pageChange", ({ id, page }) => {
        if (liveAI.active) {
            liveAI.active = false;
            io.emit("live-status", { active: false });
        }

        preparedState = { khutbahId: id, page };

        const khutbah = loadDB().find(x => String(x.id) === String(id));

        io.emit("play", {
            khutbahId: id,
            page,
            audio: khutbah?.audio[String(page)] || null
        });
    });

    // =========================
    // CLEANUP
    // =========================
    socket.on("disconnect", () => {
        console.log("👋 Listener disconnected");
        recalculateActiveLanguages();
    });
});

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
const LISTENER_URL = `http://${IP_ADDR}:${PORT}/live-listener.html`;

server.listen(PORT, "0.0.0.0", () => {
    bonjour.publish({ name: 'Jumuaa Server', type: 'http', port: PORT });
    
    console.log(`\n🚀 Serveur Actif sur le réseau !`);
    console.log(`-------------------------------------------`);
    console.log("Admin Panel: http://localhost:" + PORT + "/admin.html");
    console.log("Listener Link: " + LISTENER_URL);
    console.log(`-------------------------------------------\n`);

    console.log("Scannez ce code pour rejoindre (Android forcera Chrome) :");
    qrcode.generate(LISTENER_URL, { small: true });

    const adminUrl = "http://localhost:" + PORT + "/admin.html";
    const cmd = process.platform === 'win32' ? `start chrome --app=${adminUrl}` : `open ${adminUrl}`;
    exec(cmd, (err) => { 
        if (err) exec(process.platform === 'win32' ? `start ${adminUrl}` : `open ${adminUrl}`); 
    });
});
