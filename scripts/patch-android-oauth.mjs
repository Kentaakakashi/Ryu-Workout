import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
const scheme = 'com.kentaakakashi.ryu';

if (manifest.includes('android:scheme="' + scheme + '"')) {
  console.log('Ryu OAuth deep link is already configured.');
  process.exit(0);
}

const activityMatch = manifest.match(/<activity\\b[^>]*>/);
if (!activityMatch || activityMatch.index === undefined) {
  throw new Error('Could not find the Capacitor MainActivity in AndroidManifest.xml');
}

let activityTag = activityMatch[0];
if (!/android:launchMode=/.test(activityTag)) {
  activityTag = activityTag.replace(/>$/, ' android:launchMode="singleTask">');
  manifest = manifest.slice(0, activityMatch.index) + activityTag + manifest.slice(activityMatch.index + activityMatch[0].length);
}

const activityStart = manifest.indexOf(activityTag);
const activityEnd = manifest.indexOf('</activity>', activityStart);
if (activityStart < 0 || activityEnd < 0) {
  throw new Error('Could not locate the MainActivity closing tag');
}

const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${scheme}" android:host="auth" android:path="/callback" />
            </intent-filter>
`;

manifest = manifest.slice(0, activityEnd) + intentFilter + manifest.slice(activityEnd);
writeFileSync(manifestPath, manifest);
console.log('Configured ' + scheme + '://auth/callback for Google sign-in.');
