
بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى أَشْرَفِ الْمُرْسَلِينَ. نَحْمَدُ اللهَ وَنَشْكُرُهُ عَلَى نِعَمِهِ الْعَظِيمَةِ وَفَضْلِهِ الْمُسْتَمِرِّ، الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ.

In the name of Allah, the Most Gracious, the Most Merciful. All praise and thanks are due to Allah, the Lord of all the worlds, and may peace and blessings be upon the most noble of messengers. We praise Allah and thank Him for His immense blessings and continuous grace, He by whose blessing good deeds are accomplished.

---

# 🚀 Khutba Connected

Khutba Connected is a live mosque presentation and synchronized audio system designed to solve the problem of multilingual khutbah accessibility in mosques and Islamic centers.

In many countries, mosque communities are multilingual. The khutbah is often delivered in a single language — commonly Arabic — while many listeners may not fully understand it. This creates a major communication barrier for non-Arabic-speaking fidels, converts, visitors, younger generations, and international communities.

Traditionally, simultaneous translation during the khutbah is difficult because:

* it requires additional translators,
* interrupts concentration,
* creates noise inside the mosque,
* or forces listeners to follow separate written translations.

Khutba Connected provides a practical solution by allowing the imam or mosque administrator to prepare synchronized translated audio for each page of the khutbah beforehand.

During the live khutbah:

* the imam controls the PDF pages,
* listeners connect from their phones and put on earphones,
* and the translated audio automatically plays in sync with the current page.

This enables listeners to follow the khutbah in their own language silently and in real time through their personal devices.

The system works entirely on the local WiFi network and does not require internet access after installation.

### Main Features

* 📖 Live PDF khutbah viewer
* 🔊 Synchronized translated audio playback
* 🌍 Multilingual khutbah accessibility
* 📱 Mobile-friendly interface
* 💻 Windows support
* 🤖 Android + Termux support
* 📡 QR code instant connection
* 🌐 Offline local network operation
* 👥 Multiple listeners simultaneously
* 🎙 Audio recording or upload per page
* ⚡ Real-time page synchronization
* 🕌 Designed for mosques and Islamic lessons

Khutba Connected helps make khutbahs more accessible, understandable, and inclusive for multilingual Muslim communities.

---

# 📱 ANDROID INSTALLATION (TERMUX)

## 1️⃣ Install F-Droid

Download and install:

[F-Droid Official Website](https://f-droid.org?utm_source=chatgpt.com)

---

## 2️⃣ Install Required Apps

Inside F-Droid install:

* Termux
* Termux:Widget

⚠ IMPORTANT

Do NOT install Termux from Google Play.

Use the F-Droid version only.

---

## 3️⃣ Open Termux Once

After installation:

* open Termux
* wait for initialization to finish

---

# ⚡ INSTALL KHUTBA CONNECTED

## ONE STEP INSTALL

Open Termux and paste:

```bash id="g3z3zn"
bash <(curl -fsSL https://raw.githubusercontent.com/YounesMaat/Khutba-Connected/main/install.sh)
```

---

# 📱 AUTOMATIC HOME SCREEN SHORTCUT

Khutba Connected automatically creates a launcher shortcut for Termux Widget.

---

## First Time Setup

After installation:

1. Long press on Android home screen
2. Tap:

   * Widgets
3. Find:

   * Termux Widget
4. Drag it to the home screen
5. Select:

   * Start khutba
   * Stop Khutba

Done ✅

---

# ▶ START SERVER

Simply tap the:

```text id="0gmry1"
Start khutba
```

home screen shortcut.

The server automatically:

* starts
* displays QR code
* shows local IP
* allows listeners to connect
* opens the imam interface


Example:

```text id="f63nyr"
http://192.168.1.5:3000
```

---

# 📡 CONNECT PHONES

All listener phones must:

* be connected to same WiFi
* open the displayed address
* OR scan the QR code
* Click enable audio

Done ✅

Once the Imam starts the Khutbah on his interface, the translation audios will play automatically on the listeners' phones

---

# ⚠ IF SHORTCUT DOES NOT APPEAR

Open Termux and run:

```bash id="nglmyh"
termux-reload-settings
```

Then:

* remove widget
* add widget again

---

# 💻 WINDOWS INSTALLATION

## 1️⃣ Download

Download:

```text id="tq2yd2"
JumuaaConnected.zip
```

Extract anywhere.

Recommended:

```text id="zjlwmq"
C:\JumuaaConnected
```

---

## 2️⃣ Run

Double click:

```text id="7vh7ud"
start.bat
```

The server:

* starts automatically
* opens browser automatically
* shows QR code

---

## 3️⃣ Connect Phones

Phones on same WiFi open:

```text id="jkgv7e"
http://YOUR-PC-IP:3000
```

Example:

```text id="55n8y6"
http://192.168.1.10:3000
```

---

# 🔥 FIRST WINDOWS LAUNCH

Windows Firewall may appear.

Allow:

* ✅ Private Networks
* ✅ Public Networks

---

# 📂 IMPORTANT FILES

Do NOT delete:

```text id="khh1e8"
uploads/
data/
```

These contain:

* khutbah PDFs
* recordings
* database

---

# ✅ FEATURES

* Live page synchronization
* Audio synchronization
* QR code access
* Offline local network support
* Android support
* Windows support
* Multiple listeners
* Mobile-friendly UI

---

# 🛠 TECHNOLOGIES

* Node.js
* Express
* Socket.IO
* PDF.js
* Termux


