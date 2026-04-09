# Sinergy GPS + Combustible App

Frontend corporativo construido con Expo + React Native + Expo Router + TypeScript, listo para web y móvil.

## Incluye
- Login real con tu backend
- Persistencia de sesión con Zustand
- Mapa web con Leaflet y mapa nativo con react-native-maps
- Lista de equipos en vivo
- Consulta real de posiciones `/fleet/positions`
- Consulta real de dispositivos `/devices`
- Consulta real de descargas `LitrosT`
- Reportes resumidos por rango de fechas
- Perfil y cierre de sesión

## 1) Instalación

```bash
npm install
```

## 2) Variables de entorno

Crea el archivo `.env` en la raíz:

```bash
EXPO_PUBLIC_API_BASE_URL=http://3.19.86.247:5000
```

## 3) Ejecutar

### Web
```bash
npm run start:web
```

### General (elige plataforma desde Expo)
```bash
npm run start
```

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## 4) Logo corporativo
Reemplaza este archivo por tu logo real:

```text
assets/logo.png
```

## 5) Notas de producción
- La app ya apunta por defecto a `http://3.19.86.247:5000`.
- Para web en producción, conviene publicar tu API detrás de HTTPS para evitar bloqueos del navegador.
- Si tu backend devuelve nombres de campo distintos, el frontend ya incluye normalizadores tolerantes.

## 6) Estructura

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    login.tsx
  (tabs)/
    _layout.tsx
    map.tsx
    fuel.tsx
    reports.tsx
    profile.tsx

src/
  api/
  components/
  hooks/
  store/
  theme/
  types/
  utils/
```
