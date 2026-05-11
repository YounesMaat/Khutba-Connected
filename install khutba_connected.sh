#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Khutba Installer Starting..."

pkg update -y && pkg upgrade -y
pkg install -y nodejs git curl

cd ~

rm -rf Khutba-Connected

git clone https://github.com/YounesMaat/Khutba-Connected.git

cd Khutba-Connected/sermon-app

npm install

mkdir -p ~/.shortcuts

cat > ~/.shortcuts/start-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

cd ~/Khutba-Connected/sermon-app

termux-wake-lock

node server.js &

sleep 2

termux-open-url http://localhost:3000
EOF

cat > ~/.shortcuts/stop-khutba << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
pkill node
EOF

chmod +x ~/.shortcuts/start-khutba
chmod +x ~/.shortcuts/stop-khutba

echo "✅ DONE - Add Termux Widget now"