# Med.AI

A comprehensive medication management app designed to help users stay on track with their medication schedules, featuring AI assistance, health data integration, and travel planning.

## Features

- **Medication Tracking**: Log doses, set reminders, and track adherence
- **AI Health Coach**: Personalized insights and recommendations
- **Travel Planning**: Manage medications for trips with packing calculators
- **Health Integration**: Sync with Apple Health/Google Fit
- **Offline Support**: PWA functionality for app-like experience
- **Touch Gestures**: Swipe to log doses on mobile devices

## Tech Stack

- React 18 + Vite
- Capacitor (for native Android/iOS)
- Base44 backend
- PWA with service worker
- Touch gestures with @use-gesture/react

## Development Setup

1. Clone the repo
2. `npm install`
3. `npm run dev` for web development
4. `npm run build && npx cap sync` for native builds

## App Store Launch Checklist

- [ ] Add app icons and splash screens to `resources/` folder
- [ ] Test on physical devices (Android/iOS)
- [ ] Create privacy policy and terms of service
- [ ] Set up app store listings with screenshots
- [ ] Ensure HIPAA compliance for health data
- [ ] Test all Capacitor plugins (health, haptics, calendar)
- [ ] Verify offline functionality
- [ ] Run security audit
- [ ] Prepare beta testing group

## Publishing

- **Android**: Build signed APK/AAB, upload to Google Play
- **iOS**: Build archive, upload to App Store Connect

## Support

For issues or contributions, please open a GitHub issue.
