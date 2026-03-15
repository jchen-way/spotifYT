# spotifYT

Portfolio project with two parts:

- `spotifYT-mobile`: Expo React Native client
- `spotifYT-backend`: Node/Express backend for YouTube search and media processing

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
EXPO_PUBLIC_BACKEND_URL=http://YOUR-LAN-IP:3000 npx expo start
```

## Render hosting

The backend is prepared for Render with:

- `/render.yaml`
- `spotifYT-backend/Dockerfile`
- `spotifYT-backend/.dockerignore`

Notes:

- The mobile app is not hosted on Render. Build and share it separately with Expo/EAS.
- Free Render is enough for a portfolio demo, but the service will sleep after inactivity and wake slowly.
- The backend uses temporary files only. Final media is saved on the phone after download.
