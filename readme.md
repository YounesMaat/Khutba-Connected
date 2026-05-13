# 🚀 Khutba Connected

Live synchronized khutbah system for mosques.

* 📖 Imam controls pages
* 🔊 Listeners hear synchronized audio
* 📱 Works on Android phones
* 💻 Works on Windows
* 🌐 Local network / offline capable

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

## ONE TAP INSTALL

Open this link directly on your Android phone:

```text id="10tx6l"
termux://bash -c "curl -fsSL https://raw.githubusercontent.com/YounesMaat/Khutba-Connected/main/install.sh | bash"
```

OR tap:

```text id="lgx6uq"
▶ INSTALL IN TERMUX
```

---

## Manual Install (Fallback)

If one-tap install does not work:

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

   * khutba

Done ✅

---

# ▶ START SERVER

Simply tap the:

```text id="0gmry1"
khutba
```

home screen shortcut.

The server automatically:

* starts
* displays QR code
* shows local IP
* allows listeners to connect

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

Do NOT allow:

* ❌ Public Networks

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
* FFmpeg
* Termux

---

# 👤 Author

Created by Younes Maatallaoui
