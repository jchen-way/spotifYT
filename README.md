# spotifYT

Portfolio project with two parts:

- `spotifYT-mobile`: Expo React Native client
- `spotifYT-backend`: local Node/Express backend for YouTube search and media processing

## Recommended setup

This project is intended to run with a local backend on your laptop and the mobile app on your phone over the same network.

Why:

- `yt-dlp` is more reliable from a home machine than from public cloud IPs
- downloaded media is saved to the phone for offline playback
- playlists, ratings, and listening stats live in on-device SQLite

## Local development

Backend:

```bash
cd spotifYT-backend
npm install
npm start
```

Mobile:

```bash
cd spotifYT-mobile
npm install
npx expo start -c
```

Set `EXPO_PUBLIC_BACKEND_URL` in `spotifYT-mobile/.env` to your laptop LAN address, for example:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:3000
```

## Notes

- Downloaded media is saved on the phone for offline playback.
- Search and downloading require the laptop backend to be reachable on the same network.
- This repo is intentionally set up for local backend use, not public hosting.
