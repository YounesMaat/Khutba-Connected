
---

# 📱 STEP 3 — Add “CLICKABLE INSTALL BUTTON” (GitHub trick)

GitHub supports clickable links that open Termux via intent.

Add this under it:

```markdown id="r4"
## 📱 One Tap Install (Android)

[▶ Install in Termux](termux://bash -c "curl -fsSL https://raw.githubusercontent.com/YounesMaat/Khutba-Connected/main/install.sh | bash")
