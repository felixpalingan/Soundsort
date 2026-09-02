# Design System

<!-- impeccable:design-schema 1 -->

## Visual World & Palette

- **Theme**: Modern Glassmorphic Dark Studio
- **Background Main**: `#0a0b10`
- **Surface**: `#12141e`
- **Surface Elevated / Cards**: `#181b28`
- **Glass Fill**: `rgba(22, 26, 40, 0.75)` with `backdrop-filter: blur(16px)`
- **Glass Borders**: `rgba(255, 255, 255, 0.08)` (Default) / `rgba(255, 255, 255, 0.16)` (Hover/Active)

### Accent Colors
- **Cyan**: `#00f2fe` (AI, Actions, Highlights)
- **Purple**: `#9d4edd` (Sub-genres, Gradients)
- **YouTube Red**: `#ff0000` / `#ff4b2b` (YouTube Music Export buttons & badges)
- **Spotify Green**: `#1db954` (Spotify Badges)
- **Emerald Green**: `#10b981` (Connected & Success States)
- **Ruby Red**: `#ef4444` (Delete & Danger Actions)

## Typography

- **Headings Font**: `'Outfit', -apple-system, sans-serif` (Weights: 700, 800)
- **Body Font**: `'Inter', -apple-system, sans-serif` (Weights: 400, 500, 600)
- **Type Scale**:
  - `H1`: 1.5rem / 24px (800 weight)
  - `H2`: 1.35rem / 22px (700 weight)
  - `H3`: 1.15rem / 18px (700 weight)
  - `Body`: 0.875rem / 14px (400, 500 weight)
  - `Meta / Badges`: 0.75rem / 12px (600, 700 weight)
  - *Rule: No functional or interactive UI text below 12px (WCAG compliance).*

## Components & UI Patterns

1. **Navigation Tabs**: Pill-shaped switcher (`Track Library` vs `My Web Playlists`) with active state elevation and counter badges.
2. **Glass Panels**: Clean rounded panels (`16px` border-radius) with subtle border contrast and backdrop blur.
3. **Playlist Cards**: Interactive cards with track count badges, mini track previews, YouTube sync status, and action buttons (`Export to YT`, `Add Genre`, `View & Edit`).
4. **Floating Selection Pill**: Fixed bottom bar that animates when songs are selected, enabling bulk addition to playlists.
5. **Inspector Drawer**: Modal view to inspect individual songs in any playlist with live search, removal, and direct YouTube export.
