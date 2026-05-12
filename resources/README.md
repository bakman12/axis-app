# App Icons and Splash Screens

Place the following image files in this `resources` folder:

## Required Files
- `icon.png` (1024x1024px) - App icon
- `icon-foreground.png` (1024x1024px) - Foreground icon for Android adaptive icons
- `icon-background.png` (1024x1024px) - Background for Android adaptive icons
- `splash.png` (2732x2732px) - Splash screen image

## Generation
Use a tool like:
- https://capacitorjs.com/docs/guides/splash-screens-and-icons
- Or online generators

After adding images, run:
```
npx capacitor-assets generate
```

This will create platform-specific icons and splash screens.