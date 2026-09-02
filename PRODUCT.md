# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Music listeners, playlist curators, and power users with extensive music libraries across Spotify, YouTube Music, SoundCloud, or local files who need an effortless, intelligent way to categorize tracks into granular subgenres and export them directly to organized YouTube Music playlists.

## Product Purpose

SoundSort eliminates the friction of manual playlist curation by combining Google Gemini AI classification with a real-time, interactive Web Playlists Studio that streams batches of songs directly into YouTube Music.

## Positioning

A zero-friction, local-first musicological organizer with AI-powered multi-source ingestion and live batch streaming to YouTube Music playlists without hitting rate or session expiration limits.

## Operating Context

Runs as a local FastAPI backend + Vanilla JS/CSS glassmorphic dark UI dashboard with real-time Server-Sent Events (SSE) for AI streaming and direct YouTube Music API integration.

## Capabilities and Constraints

- **Multi-Source Ingestion**: Ingests `.csv` files, Spotify/SoundCloud/YouTube links, YouTube Music Liked Songs, or raw text lists (`Artist - Title`).
- **AI Classification**: Uses Google Gemini models (`gemini-3.7-flash`, `gemini-3.5-flash`, etc.) with multi-model fallback and streaming progress.
- **Web Playlists Studio**: 
  - Create and manage playlists on the web.
  - One-click bulk genre dump to playlists.
  - Checkbox multi-select and individual song addition.
  - Auto-generate playlists from all detected genres.
- **Streaming YouTube Export**: Pushes songs to YouTube Music in small real-time batches to avoid cookie/auth timeouts and preserve track order.
- **Privacy & Local State**: Stores track classifications locally in `db.json` and playlists in `playlists.json`; secrets are protected via `.gitignore`.

## Brand Commitments

- **Aesthetic**: Modern dark studio UI with glassmorphism, clean typography, vibrant neon accent touches, and WCAG-compliant legibility.
- **Tone**: High-energy, professional, music-centric, and snappy.

## Product Principles

1. **User Control First**: AI proposes genre classifications and playlist structures; the user can freely inspect, modify, merge, or remove tracks before exporting.
2. **Reliable & Resilient Syncing**: Commit data in streaming batches so no work is lost if sessions or network connections drop.
3. **Frictionless Workflow**: Support both 1-click automated workflows (auto-create playlists from genres) and granular manual curation (checkbox selectors, inspector drawer).
