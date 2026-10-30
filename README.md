# Ryu — Train with intent

Ryu is a mobile-first workout companion with a dark, tactile visual identity, liquid-glass surfaces, an expandable Dynamic Island-style feedback system, and RPG-inspired progression tied to real logged workouts.

## Get the Android app

Every successful GitHub Actions build now produces an installable **Android debug APK** as well as the web assets.

1. Open [GitHub Actions](https://github.com/Kentaakakashi/Ryu-Workout/actions).
2. Open the latest successful **Build Ryu** run on the `main` branch.
3. Scroll to **Artifacts** and download **`ryu-android-debug-apk`**.
4. Extract the downloaded ZIP and tap `app-debug.apk` on your Android phone to install it. Android may ask you to allow installs from the app you used to download/open the APK.

The `ryu-web-dist` artifact is only the website build (`index.html` plus assets); **it is not the Android app**. Download the APK artifact for installation.

This is a debug APK for testing, not a Play Store-signed release.

## Current foundation

- Responsive React + TypeScript + Vite app.
- Capacitor Android packaging with app ID `com.kentaakakashi.ryu`.
- Workout sessions with set logging, rest timer, session duration and completion summary.
- Local-first session history, XP and level progression.
- Achievement milestones and a seven-day consistency view.
- Nyxhora-inspired expandable notification island with priority queue and contextual feedback.
- Responsive navigation, accessible labels, reduced-motion support and reduced-transparency fallback.
- GitHub Actions typecheck, web build, Android APK build, and downloadable artifacts.

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Create a production web build:

```bash
npm run build
npm run preview
```

Build the Android app in an environment with Android tooling:

```bash
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

The GitHub Actions workflow runs this Android packaging process in the cloud, so a computer or local Android SDK is not required just to obtain the APK.

## Data and privacy

The current version stores session history, XP and streak state in browser local storage. No backend, account system, cloud sync, analytics service, or real Android background-notification integration is connected. The reminder setting is a preference only and does not schedule system notifications yet.

## Design references

- [Aceternity Liquid Glass](https://ui.aceternity.com/components/liquid-glass)
- [Nyxhora Dynamic Island](https://ui.nyxhora.com/docs/components/dynamic-island)
- [Capacitor](https://capacitorjs.com/docs)

The visual components are adapted into the app's own design system rather than imported as a full prebuilt dashboard.
