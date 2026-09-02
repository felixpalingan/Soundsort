# SoundSort 🎵
> AI-Powered Music Classifier, Web Playlist Studio, Local ID3 Tagger & Audio Downloader with Real-Time YouTube Music Sync.

SoundSort analyzes your music library using Google Gemini AI, automatically categorizes songs into curated genre buckets (Alt Rock, Scenecore, Indonesian Pop, Breakbeat, Phonk, Techno/Rave, etc.), provides an interactive **Web Playlists Studio** to curate playlists, writes ID3 metadata tags directly to local audio files, downloads online streams with tags, and syncs playlists directly into your YouTube Music account in real-time batches.

---

## Features ✨
- **Gemini AI Classification**: Deep musicological classification into target genre buckets.
- **💾 Local Audio Scanner & ID3 Tagger**:
  - Scan folders on your PC (`.mp3`, `.flac`, `.m4a`, `.ogg`, `.wav`).
  - **Auto-Tag Local Files**: Write AI-classified Genre, Subgenre, Grouping, and Vibe directly into audio tags on disk.
  - **Genre Folder Organizer**: Automatically organize files into structured subfolders by genre.
- **⬇️ Online Audio Downloader with Auto-Tagging**:
  - Download songs from YouTube/SoundCloud/Spotify lists to local MP3.
  - Automatically embeds ID3 tags, Album Art, Artist, Title, and AI Genres into the downloaded file.
  - Download entire playlists into dedicated folders in 1 click.
- **📑 Web Playlists Studio**: 
  - Create playlists directly in your browser.
  - **Bulk Genre Dump**: Add all songs from an entire genre/subgenre into a playlist with 1 click.
  - **Multi-Select & Checkbox Selector**: Pick songs one-by-one or in bulk from the library table/cards.
  - **Auto-Generate Playlists**: 1-click generation of playlists from all detected genres in your library.
- **🚀 One-Click YouTube Music Sync**: Streams and creates playlists on your YouTube Music account per batch to prevent auth expiration.
- **📄 CSV & Multi-Source Importer**: Paste text directly or import `.csv` / `.txt` track lists.
- **✨ Impeccable UI Design**: Modern glassmorphic dark studio UI built to high WCAG accessibility and design standards.

---

## 🛠️ Step-by-Step Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/felixpalingan/Music-sort.git
cd Music-sort
pip install -r backend/requirements.txt
```

### 2. Get a Free Google Gemini API Key 🔑
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API Key** -> Select/Create a project.
4. Copy your API Key (starts with `AIza...` or similar).
5. Paste it in the **Settings (⚙️)** menu of the SoundSort Web UI, or set it as an environment variable:
   ```bash
   set GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

### 3. Ingesting Music 📄
You can import tracks into SoundSort via:
1. **💾 Scan Local Music Folder**: Enter a folder path on your PC (e.g. `C:\Users\Felix\Music`) to load and tag your local audio files.
2. **📁 CSV File**: Import `.csv` exported from Spotify/YT Music with headers `Artist` and `Title`.
3. **📋 Direct Paste**: Paste `Artist - Title` or Spotify/SoundCloud playlist links.
4. **❤️ YouTube Music Likes**: 1-click import of all your liked tracks from YouTube Music.

---

### 4. Connect to YouTube Music (Session Auth) 🎧
1. Open [music.youtube.com](https://music.youtube.com) in your browser and ensure you are signed in.
2. Press **`F12`** (or right-click -> **Inspect**) and navigate to the **Network** tab.
3. Click or search for any song on YouTube Music to trigger network activity.
4. Look for any POST/GET request to `music.youtube.com` (e.g. `browse`, `player`, `get_search_suggestions`, or `next`).
5. Right-click the request -> **Copy** -> **Copy request headers**.
6. Open SoundSort Web UI -> Click **Settings (⚙️)** -> Paste into **YouTube Music Browser Headers** -> Click **Connect**.

---

### 5. Run SoundSort 🚀
```bash
python -m uvicorn backend.main:app --reload --port 8000
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

- **Track Library**: Search, filter by source (Local / Online) and genre, download online tracks, or tag local files.
- **My Web Playlists**: Curate playlists on the web and export to YouTube Music or download as local MP3s.
- **Local Files & Downloads**: Bulk ID3 tagger and folder organizer.
