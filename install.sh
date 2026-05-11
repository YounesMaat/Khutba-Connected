#!/data/data/com.termux/files/usr/bin/bash
set -e

clear
echo "🚀 Installing Khutba-Connected..."

# -----------------------------
# 1. UPDATE SYSTEM
# -----------------------------
pkg update -y && pkg upgrade -y

# -----------------------------
# 2. INSTALL DEPENDENCIES
# -----------------------------
pkg install -y nodejs git curl

# Ensure storage access (important for Android)
termux-setup-storage || true

# -----------------------------
# 3. CLEAN OLD INSTALL
# -----------------------------
cd ~
rm -rf Khutba-Connected

# -----------------------------
# 4. CLONE PROJECT
# -----------------------------
echo "📦 Cloning repository..."
git clone https://github.com/YounesMaat/Khutba-Connected.git

# -----------------------------
# 5. VERIFY STRUCTURE
# -----------------------------
cd Khutba-Connected

if [ ! -d "sermon-app" ]; then
  echo "❌ ERROR: sermon-app folder not found!"
  echo "Check repository structure."
  exit 1
fi

cd sermon-app

echo "📂 Entered project folder"

# -----------------------------
# 6. INSTALL NODE DEPENDENCIES
# -----------------------------
echo "📦 Installing npm dependencies..."
npm install

# -----------------------------
# 7. CREATE TERMUX WIDGETS
# -----------------------------
mkdir -p ~/.shortcuts

# START SERVER
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app

termux-wake-lock

echo "🚀 Starting server..."

node server.js &

sleep 2

termux-open-url http://localhost:3000
EOF

# STOP SERVER
cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

echo "🛑 Stopping server..."
pkill -f node
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

# -----------------------------
# 8. DONE
# -----------------------------
echo ""
echo "✅ INSTALL COMPLETE"
echo "📱 Add Termux Widget to your home screen"
echo "▶ Use: Start Khutba"
echo "🛑 Use: Stop Khutba"
