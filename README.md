# Ryu — Train with intent

Ryu is a mobile-first workout companion with a dark, tactile visual identity, liquid-glass surfaces, an expandable Dynamic Island-style feedback system, and RPG-inspired progression tied to real logged workouts.

## Current foundation

- Responsive React + TypeScript + Vite app.
- Capacitor configuration prepared for Android packaging.
- Workout sessions with set logging, rest timer, session duration and completion summary.
- Local-first session history, XP and level progression.
- Achievement milestones and a seven-day consistency view.
- Nyxhora-inspired expandable notification island with priority queue and contextual feedback.
- Responsive navigation, accessible labels, reduced-motion support and reduced-transparency fallback.
- GitHub Actions build and typecheck workflow.

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

## Android packaging

Capacitor is configured with app ID `com.kentaakakashi.ryu` and output directory `dist`. With the Android SDK available:

```bash
npm run build
npx cap add android
npx cap sync android
```

The native Android project and a signed release APK still need to be generated and tested in an Android SDK environment. The current GitHub Actions workflow validates and uploads the web build; it does not yet produce an APK.

## Data and privacy

The current version stores session history, XP and streak state in browser local storage. No backend, account system, cloud sync, analytics service, or real Android background-notification integration is connected. The reminder setting is a preference only and does not schedule system notifications yet.

## Design references

- [Aceternity Liquid Glass](https://ui.aceternity.com/components/liquid-glass)
- [Nyxhora Dynamic Island](https://ui.nyxhora.com/docs/components/dynamic-island)
- [Capacitor](https://capacitorjs.com/docs)

The visual components are adapted into the app's own design system rather than imported as a full prebuilt dashboard.