# spotifYT Mobile

Expo mobile client for the `spotifYT` portfolio project.

## Local development

```bash
npm install
npx expo start -c
```

Use Expo Go on a phone connected to the same network as the backend.

Configure the backend URL in `.env`:

```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR-LAN-IP:3000
```

## What it does

- Search YouTube through the local backend proxy
- Download `mp3` and `mp4` files for offline playback
- Store media metadata, playlists, ratings, and listening history in SQLite
- Show a wrapped-style stats view based on local listening history

## Notes

- Playback is local to the phone after a file has been downloaded.
- Search and download require the local backend to be reachable.
- The intended workflow is laptop backend plus phone client on the same network.
