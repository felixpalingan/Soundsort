# SoundSort 🎵
AI-Powered Music Classifier & YouTube Music Playlist Synchronizer.

SoundSort analyzes your music library using Google Gemini AI and automatically organizes songs into curated genres and playlists, then syncs them directly to your YouTube Music account in real-time batches.

## Features ✨
- **Gemini AI Classification**: Classifies tracks with deep genre understanding (Alt Rock, Scenecore, Indonesian Pop, Breakbeat, Brazilian Phonk, Techno/Rave, etc.).
- **Direct-to-Playlist Pipeline**: Groups and streams batches of songs directly to YouTube Music playlists.
- **Modern Web Dashboard**: Glassmorphic dark UI with live sync logs, stats, and search.
- **Batch Processing**: Prevents session expiration and token limits with streaming per-batch commits.

## Setup & Run 🚀
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the application:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```
3. Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
