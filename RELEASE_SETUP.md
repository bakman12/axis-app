# Release Setup Guide

Both workflows trigger automatically when you push a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

You can also trigger them manually from GitHub → Actions → select workflow → Run workflow.

---

## Step 1 — Android secrets (do this first, easier)

### 1a. Create a keystore (skip if you already have one)
Run this on your machine:
```bash
keytool -genkey -v \
  -keystore axis-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias axis \
  -dname "CN=Axis, O=YourCompany, C=GB"
```
Save the keystore file and the passwords somewhere safe (password manager).

### 1b. Base64-encode the keystore
```bash
# Mac/Linux
base64 -i axis-release.jks | pbcopy   # copies to clipboard

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("axis-release.jks")) | Set-Clipboard
```

### 1c. Add GitHub secrets
Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The base64 string from step 1b |
| `ANDROID_KEYSTORE_PASSWORD` | The password you chose for the keystore |
| `ANDROID_KEY_ALIAS` | `axis` (or whatever alias you used) |
| `ANDROID_KEY_PASSWORD` | The key password (often same as keystore password) |

### 1d. Create a Google Play service account
This lets GitHub push to Play Store without your personal Google login.

1. Go to [Google Play Console](https://play.google.com/console) → Setup → API access
2. Click **Link to a Google Cloud project** (create new if prompted)
3. In Google Cloud Console → IAM & Admin → Service Accounts → Create service account
   - Name: `github-actions-play`
   - Role: none (we set it in Play Console)
4. Click the new service account → Keys → Add Key → JSON → download the `.json` file
5. Back in Play Console → Users & permissions → Invite new users
   - Email: the service account email (`github-actions-play@...iam.gserviceaccount.com`)
   - Permissions: **Release manager** on your app
6. Copy the entire contents of the JSON key file and add as a secret:

| Secret name | Value |
|---|---|
| `PLAY_SERVICE_ACCOUNT_JSON` | Full contents of the downloaded JSON key file |

### 1e. Create your Play Store listing first
The workflow uploads to the **internal track**. You must have an app listing created in Play Console before the first upload:
1. Play Console → Create app → fill in details
2. Complete the store listing (at minimum: title, short description, category, contact email, privacy policy URL)
3. Complete the content rating questionnaire
4. You do NOT need to manually upload an APK — the workflow handles that

---

## Step 2 — iOS secrets

### 2a. Generate an App Store Connect API key
This avoids 2FA issues on CI.

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Users & Access → Integrations → App Store Connect API
2. Click `+` → Name: `GitHub Actions`, Role: **App Manager**
3. Download the `.p8` key file (you can only download it once)
4. Note the **Key ID** and **Issuer ID** shown on the page

| Secret name | Value |
|---|---|
| `ASC_KEY_ID` | Key ID (e.g. `ABC1234567`) |
| `ASC_ISSUER_ID` | Issuer ID (UUID format) |
| `ASC_API_KEY_CONTENT` | Full contents of the `.p8` file (including `-----BEGIN PRIVATE KEY-----` lines) |

### 2b. Export your distribution certificate as .p12
You need an **Apple Distribution** certificate (not Development).

1. On a Mac: Keychain Access → My Certificates → right-click "Apple Distribution: ..." → Export
2. Save as `dist-cert.p12`, set a strong password
3. Base64-encode it:
```bash
base64 -i dist-cert.p12 | pbcopy
```

| Secret name | Value |
|---|---|
| `IOS_DISTRIBUTION_CERT_BASE64` | Base64-encoded .p12 file |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password you set on the .p12 |
| `IOS_KEYCHAIN_PASSWORD` | Any random strong password (used for the temporary CI keychain) |

### 2c. Export your provisioning profile
1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles → Profiles
2. Create a new **App Store Distribution** profile for bundle ID `com.spiffypillpal.care`
3. Download the `.mobileprovision` file
4. Base64-encode it:
```bash
base64 -i Axis_AppStore.mobileprovision | pbcopy
```

| Secret name | Value |
|---|---|
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded .mobileprovision file |

### 2d. Create your App Store Connect listing first
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → `+` New App
2. Bundle ID: `com.spiffypillpal.care`
3. Fill in name, primary language, SKU (e.g. `axis-medication-tracker`)
4. The workflow uploads builds to **TestFlight** — you then promote to App Store from the console

---

## Step 3 — Ship a release

Once all secrets are added:

```bash
# Bump the version in package.json if needed, then:
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

GitHub Actions will:
- **Android**: build → sign → upload to Play Store internal track (~5 min)
- **iOS**: build on cloud Mac → sign → upload to TestFlight (~15 min)

You can then:
- Android: Play Console → Internal testing → promote to Production
- iOS: App Store Connect → TestFlight build → Add to App Store submission → Submit for review

---

## Summary of all required secrets

| Secret | Used by |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Android |
| `ANDROID_KEYSTORE_PASSWORD` | Android |
| `ANDROID_KEY_ALIAS` | Android |
| `ANDROID_KEY_PASSWORD` | Android |
| `PLAY_SERVICE_ACCOUNT_JSON` | Android |
| `ASC_KEY_ID` | iOS |
| `ASC_ISSUER_ID` | iOS |
| `ASC_API_KEY_CONTENT` | iOS |
| `IOS_DISTRIBUTION_CERT_BASE64` | iOS |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | iOS |
| `IOS_KEYCHAIN_PASSWORD` | iOS |
| `IOS_PROVISIONING_PROFILE_BASE64` | iOS |
