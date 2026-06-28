# Nxtrive release guide

## Installers by platform

| Platform | Formats | Typical artifact paths |
|----------|---------|------------------------|
| **Windows** | `.msi`, `.exe` (NSIS) | `src-tauri/target/release/bundle/msi/`, `.../nsis/` |
| **macOS** | `.dmg`, `.app` | `src-tauri/target/release/bundle/dmg/`, `.../macos/` |
| **Linux** | `.deb`, `.rpm`, `.AppImage` | `src-tauri/target/release/bundle/deb/`, `rpm/`, `appimage/` |

## GitHub Actions release (all platforms)

1. Add repository secrets (Settings → Secrets → Actions):

### Windows code signing (optional but recommended)
| Secret | Description |
|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing key (optional) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password |
| `WINDOWS_CERTIFICATE` | Base64 `.pfx` Authenticode certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | PFX password |

### macOS code signing + notarization (optional but recommended)
| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64 `.p12` Developer ID Application cert |
| `APPLE_CERTIFICATE_PASSWORD` | PFX password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character team ID |

2. Tag and push to trigger the build workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or run **Build Nxtrive** manually via **Actions → workflow_dispatch**.

3. Download artifacts from the workflow run, or publish the draft GitHub Release created by `tauri-action`.

## Local Windows build

```powershell
cd privatemind
.\scripts\build-backend.ps1
npm ci --ignore-scripts
npm run tauri build
```

Installers appear under `src-tauri\target\release\bundle\`.

## Pre-release checks

```bash
# Frontend quality
npm run doctor

# Backend security tests
cd backend && pytest tests/test_security.py -q

# Accessibility
npm run test:a11y

# E2E (non-live)
npm run test:e2e
```

## Security limits (ingest)

- Max **50 MB** per uploaded file
- Max **500 MB** per drop batch
- Max **200** files per drop
- Max **5,000** files per folder ingest
- Path traversal blocked on drop uploads
- Source preview reads **archived copies only** (not arbitrary disk paths)
