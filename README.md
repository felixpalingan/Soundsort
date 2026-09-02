# SoundSort 🎵
> AI-Powered Music Classifier & Web Playlist Studio with Real-Time YouTube Music Sync.

SoundSort analyzes your music library using Google Gemini AI, automatically categorizes songs into curated genre buckets (Alt Rock, Scenecore, Indonesian Pop, Breakbeat, Phonk, Techno/Rave, etc.), provides an interactive **Web Playlists Studio** to build and curate playlists, and streams them directly into your YouTube Music account in real-time batches.

---

## Features ✨
- **Gemini AI Classification**: Deep musicological classification into target genre buckets.
- **📑 Web Playlists Studio**: 
  - Create playlists directly in your browser.
  - **Bulk Genre Dump**: Add all songs from an entire genre/subgenre into a playlist with 1 click.
  - **Multi-Select & Checkbox Selector**: Pick songs one-by-one or in bulk from the library table/cards.
  - **Auto-Generate Playlists**: 1-click generation of playlists from all detected genres in your library.
- **🚀 One-Click YouTube Music Sync**: Streams and creates playlists on your YouTube Music account per batch to prevent auth expiration.
- **📄 CSV & Multi-Source Importer**: Paste text directly or import `.csv` / `.txt` track lists exported from YouTube Music, Spotify, TuneMyMusic, or Soundiiz.
- **✨ Impeccable UI Design**: Modern glassmorphic dark studio UI built to high design and accessibility standards.

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

### 3. Prepare Your Song List / CSV 📄

You can import songs into SoundSort using any of these methods:

#### Method A: Direct Paste (Text / Tracklist)
Format: `Artist - Title` (one per line) or `Title - Artist`:
```text
Arctic Monkeys - 505
Paramore - Misery Business
6arelyhuman - Hands Up!
Sheila On 7 - Dan
Kordhell - Murder In My Mind
```

#### Method B: CSV File (Exported from Spotify / YT Music / TuneMyMusic)
CSV with headers `Artist` and `Title` (or `Track Name`, `Artist Name`, `Song Name`):
```csv
Artist,Title,Album
Arctic Monkeys,505,Favourite Worst Nightmare
Paramore,Misery Business,Riot!
6arelyhuman,Hands Up!,Hands Up!
```
*(You can export your existing playlists from Spotify/YT Music to CSV using free tools like [TuneMyMusic](https://www.tunemymusic.com) or [Soundiiz](https://soundiiz.com)).*

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

- **Import** your track list or CSV.
- **Run AI Classification** to categorize genres.
- Go to **My Web Playlists** to curate and export directly to YouTube Music!

---

### 6. UI Quality & Design Linter (Impeccable) 🎨
To scan and audit frontend UI design quality:
```bash
npx impeccable detect frontend/
```
