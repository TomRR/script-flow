# Fix macOS Release Installability

## Summary

Fix the GitHub release pipeline so macOS artifacts are not published unless they are Developer ID signed, notarized, and Gatekeeper-verified. Until Apple credentials are added, macOS release builds should fail early instead of uploading a DMG that users see as "damaged."

Apple requires Developer ID signing plus notarization for apps distributed outside the App Store. The current local Electron Builder YAML explicitly has `mac.identity: null`, which skips signing.

References:
- [Apple Platform Security: App code signing process](https://support.apple.com/guide/security-pdf/app-code-signing-process-sec3ad8e6e53/web)
- [electron-builder macOS documentation](https://www.electron.build/docs/mac/)

## Key Changes

- Add a decoupled mac signing/release service under `scriptflow-electron/scripts/` to own required secret validation, notary API key temp-file preparation, signed mac config generation, and post-build Gatekeeper verification commands.
- Extend `scriptflow-electron/scripts/build-desktop-artifact.ts` with `--require-signing`.
- Keep local builds unsigned-friendly by default.
- Make `--require-signing` fail before packaging if any mac signing/notarization secret is missing.
- Update `scriptflow-electron/scripts/desktop-builder-config-service.ts` so signed mac builds include no `identity: null`, `notarize: true`, `forceCodeSigning: true`, and explicit hardened runtime plus entitlements paths.
- Add production mac entitlements files outside the ignored `build/` directory, then reference them explicitly from the generated builder config.
- Update `.github/workflows/release.yml` so the mac matrix build passes `--require-signing`.

## Required CI Secrets

- `CSC_LINK`: Developer ID Application `.p12` certificate content/path supported by electron-builder
- `CSC_KEY_PASSWORD`: password for that certificate
- `APPLE_API_KEY`: App Store Connect API private key content
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`

## Verification

- Unit test unsigned local mac config still sets `identity: null`.
- Unit test `--require-signing` throws with missing secret names.
- Unit test signed mac config enables notarization, force signing, Gatekeeper assessment, hardened runtime, and entitlements.
- Unit test the release workflow/smoke check requires signed mac releases.
- In the actual mac CI build, verify the packaged app/artifact with `codesign`, `spctl`, and `xcrun stapler validate`.

## Assumptions

- The failing artifact is the GitHub release DMG/zip.
- Apple signing credentials are not available yet, so the first implementation should prevent broken mac releases until those secrets are configured.
- No app data schema changes are needed.
