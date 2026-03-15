# spotifYT Mobile

Expo mobile client for the `spotifYT` portfolio project.

## Local development

```bash
npm install
EXPO_PUBLIC_BACKEND_URL=http://YOUR-LAN-IP:3000 npx expo start
```

Use Expo Go on a phone connected to the same network as the backend.

## What it does

- Search YouTube through the backend proxy
- Download `mp3` and `mp4` files for offline playback
- Store media metadata, playlists, ratings, and listening history in SQLite
- Show a wrapped-style stats view based on local listening history

## Notes

- Playback is local to the phone after a file has been downloaded.
- Search and download still require the backend to be reachable.
- The backend URL is configured with `EXPO_PUBLIC_BACKEND_URL`.
