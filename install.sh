#!/data/data/com.termux/files/usr/bin/bash

clear
echo "🚀 Installing Khutba-Connected..."

# Update system
pkg update -y && pkg upgrade -y

# Install dependencies
pkg install -y nodejs git curl

# Go home
cd ~

# Remove old install if exists
rm -rf Khutba-Connected

# Clone repo
git clone https://github.com/YounesMaat/Khutba-Connected.git

# Enter correct folder (IMPORTANT)
cd Khutba-Connected/sermon-app

# Install Node dependencies
npm install

# Create widget shortcuts
mkdir -p ~/.shortcuts

# START SERVER
cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app

termux-wake-lock

node server.js &

sleep 2

termux-open-url http://localhost:3000
EOF

# STOP SERVER
cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

pkill node
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

echo ""
echo "✅ INSTALL COMPLETE"
echo "👉 Add Termux Widget to home screen"
echo "👉 Use Start Khutba button"