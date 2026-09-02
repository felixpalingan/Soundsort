# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Audiophiles, music collectors, playlist curators, and power listeners with multi-source libraries (Spotify, YouTube Music, SoundCloud, and local files) who want an all-in-one Hi-Fi music suite to listen to vinyl-style audio with synchronized lyrics, organize songs with Gemini AI, tag physical audio files on disk, download tracks with auto-metadata, and sync playlists to YouTube Music.

## Product Purpose

SoundSort is a modular Mega App that bridges analog music culture with modern AI curation: featuring a dedicated Hi-Fi Turntable & Synced Lyrics Player, deep Gemini AI Genre Categorization, local ID3 Audio Tagging & Folder Sorting, High-Speed Online Audio Downloader, and Web Playlists Studio with YouTube Music Sync.

## Positioning

A zero-friction, modular Hi-Fi audio workbench that unifies music playback, real-time synced lyrics, physical audio file tagging, fast downloading, and AI-driven playlist curation without clutter.

## Operating Context

Runs as a local FastAPI backend + Vanilla JS/CSS Hi-Fi Vinylist dashboard with modular single-page views (`#player`, `#analyzer`, `#tagger`, `#downloader`, `#playlists`), persistent global bottom mini-player, real-time LRCLIB synced lyrics engine, and local ID3 tagging via Mutagen & FFmpeg.

## Core Modules & Capabilities

- **1. 🎵 Hi-Fi Vinyl & Synced Lyrics Player (`#player`)**: Grand turntable deck with spinning vinyl record, precision tonearm with red LED cartridge, analog Pitch & Volume rotary knobs, circular time arc, ultra-bold poster typography, and real-time synchronized LRC lyrics with auto-scrolling and line seek.
- **2. 🧠 AI Genre Analyzer & Classifier (`#analyzer`)**: Multi-source ingestion (links, CSV, text, YT Likes), Gemini 3.7 Flash batch classification with live SSE progress, sub-genre merging, and interactive card/table sorting matrix.
- **3. 🏷️ Local File ID3 Tagger & Organizer (`#tagger`)**: Scans local PC audio folders (`.mp3`, `.flac`, `.m4a`, `.ogg`, `.wav`), 1-click batch embed ID3v2.4/Vorbis tags directly to disk, and organizes files into genre subfolders (`Music/Sorted/[Genre]/`).
- **4. ⬇️ High-Speed Audio Downloader (`#downloader`)**: Downloads online streams (YouTube/SoundCloud/Spotify) to high-bitrate MP3 with auto-embedded ID3 tags, artwork, and AI genres.
- **5. 📑 Web Playlists Studio & YT Sync (`#playlists`)**: Interactive web playlist curation, 1-click whole genre dumping, custom vibe mood builder, streaming YouTube Music sync, and 1-click bulk playlist downloading.
- **🎚️ Persistent Global Mini-Player**: Bottom playback bar active across all pages for uninterrupted listening.

## Brand Commitments

- **Aesthetic**: Hi-Fi Analog Vinylist & Warm Cream Poster Typography (inspired by classic turntable decks, bold condensed typefaces, and analog red LED accents).
- **Tone**: Audiophile-grade, analog-warm, responsive, and precise.
- **Accessibility**: 100% WCAG-compliant contrast, smooth hardware-accelerated GPU animations, and zero layout thrash.

## Product Principles

1. **Modular Clarity (Zero Clutter)**: Each feature lives in a dedicated, distraction-free module while sharing a unified global music state and persistent player.
2. **True Physical Ownership**: Give users the power to write metadata directly into their physical audio files and store music locally.
3. **Instant Visual Delight**: Every interaction — from the spinning vinyl disc to the real-time highlighted lyrics and analog rotary knobs — feels tactile, alive, and premium.
