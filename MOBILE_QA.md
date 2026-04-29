# Mobile QA Checklist — BJJ Academia PWA

## QR Scanner
- [ ] QR scanner works on mobile Chrome (HTTPS)
- [ ] QR scanner works on mobile Safari (HTTPS)
- [ ] Camera permission flow works
- [ ] Manual code entry fallback works

## Touch & Layout
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] Viewport meta tag correct (no horizontal scroll)
- [ ] Safe area insets respected (notch, home indicator)

## PWA Install
- [ ] PWA installs on Android (Chrome → Add to Home Screen)
- [ ] PWA installs on iOS (Share → Add to Home Screen)
- [ ] Install prompt shows on Android when `beforeinstallprompt` fires
- [ ] iOS manual install instructions show on Safari
- [ ] Install prompt does not show when already installed

## PWA Update
- [ ] Update prompt shows when new version deployed
- [ ] "Atualizar" button reloads with new version
- [ ] Auto-dismiss after 24 hours if not acted on

## Offline
- [ ] App shell loads when offline (cached)
- [ ] No sensitive business data cached in service worker
- [ ] Auth endpoints use NetworkOnly (not cached)

## Icons
- [ ] Home screen icon displays correctly (192x192)
- [ ] Splash screen uses correct theme color
- [ ] Maskable icon works on Android launchers

> **Note:** Replace SVG icons with production-ready PNG icons before pilot launch.
> Current icons are generated placeholders with "JJ" text on black background.
