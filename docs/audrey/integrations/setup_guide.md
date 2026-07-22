# Audrey Bot Setup Guide

## Telegram Registration with @BotFather
1. Open Telegram and search for @BotFather.
2. Start a chat and use the command `/newbot` to create a new bot.
3. Follow the prompts to set a name and username for your bot.
4. Once complete, you'll receive a token. Save this token as it will be used for authentication in bot integration.

## Discord Setup
1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click on `New Application` and name your application.
3. In the application settings, click on `Bot` and then `Add Bot`.
4. Save the token provided for the bot. This will be used for authentication.
5. Set required permissions and enable Privileged Gateway Intents if needed.
6. Invite the bot to your server using the generated URL.

## Integration Templates
### Telegram Integration Template
```json
{
  "type": "telegram",
  "token": "YOUR_TELEGRAM_BOT_TOKEN",
  "chat_id": "YOUR_CHAT_ID"
}
```

### Discord Integration Template
```json
{
  "type": "discord",
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "channel_id": "YOUR_CHANNEL_ID"
}
```

## Conclusion
This setup guide provides the necessary steps to integrate Audrey bot with both Telegram and Discord. Make sure to replace placeholder values with actual tokens and IDs in your integration templates. 

---
Last updated: 2026-04-12 03:16:56 UTC
