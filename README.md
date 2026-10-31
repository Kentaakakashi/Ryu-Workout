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
- Workout sessions with per-set reps, load and timed holds, rest timer, session duration and completion summary.
- Personal records derived from your actual logged sets, with local-first history and account sync.
- Custom workout routine builder with user-owned Supabase templates and offline local drafts.
- Daily training contracts with claimable bonus XP persisted in the account quest ledger.
- Cloud-synced measurement units, default rest timer, sound preference, reminders preference and default routine.
- Local-first session history, XP and level progression.
- Supabase email/password account creation and sign-in.
- Secure per-user database tables for profiles, workout sessions, set logs, and settings, protected by Row Level Security.
- Signed-in workout sessions and their completed sets are written to Supabase; local history remains available on-device. Per-set reps, load and timed holds, custom routines, daily quest rewards and settings are stored against the signed-in user with Row Level Security. Personal records are derived from the saved set log.
- Achievement milestones, daily quest contracts, a seven-day consistency view and personal record wall.
- Nyxhora-inspired expandable notification island with priority queue and contextual feedback.
- React Bits-inspired SpotlightCard, TiltedCard, ClickSpark, CountUp, ShinyText and reveal effects, adapted for Ryu's mobile-first dark visual system.
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

Ryu uses browser local storage for resilient on-device progress and Supabase for authenticated accounts and workout records. The frontend only uses a Supabase publishable key; no service-role or database secret is shipped to the client. Database tables have Row Level Security policies so signed-in users can only access their own records. Existing local history is preserved when an account signs in; historical local records are not silently uploaded as if they were already cloud-saved. New completed sessions are saved to the account when signed in. AI coaching, full cross-device settings sync, automatic migration of older local history, and real Android scheduled notifications are still in progress.

For a different Supabase project, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are public client settings, not secret credentials. Never add a Supabase secret key or service-role key to frontend code or GitHub Pages.

## Design references

- [React Bits](https://reactbits.dev/) — SpotlightCard, TiltedCard, ClickSpark, CountUp and ShinyText patterns adapted into Ryu's motion system.
- [Magic UI Animated Circular Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar) — adapted as Ryu's animated level ring.
- [Magic UI Number Ticker](https://magicui.design/docs/components/number-ticker) — adapted for the lifetime XP counter.
- [Magic UI Magic Card](https://magicui.design/docs/components/magic-card) — adapted for the pointer-following border and spotlight on the RPG card.
- [Aceternity Liquid Glass](https://ui.aceternity.com/components/liquid-glass)
- [Nyxhora Dynamic Island](https://ui.nyxhora.com/docs/components/dynamic-island)
- [Capacitor](https://capacitorjs.com/docs)

The component patterns are adapted to Ryu's own vanilla-CSS design system and mobile layout; Ryu does not install a prebuilt dashboard or require Tailwind for these components. Magic UI is MIT-licensed. React Bits uses MIT plus the Commons Clause; its attribution and applicable license terms are included in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
