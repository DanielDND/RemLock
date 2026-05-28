## Lock RemNote Until Daily Queue Done

This plugin sends a "lock" signal when RemNote opens and an "unlock" signal when the review queue reaches 0 remaining cards.

Recommended setup is to send signals to a webhook endpoint that turns them into Android notifications for MacroDroid to react to.

### Development

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. In RemNote:
   - Settings → Plugins → Build → Develop from localhost → `http://localhost:8080`

### Build / Upload

1. `npm run build`
2. Upload the generated `PluginZip.zip`:
   - Settings → Plugins → Build → Upload Plugin

