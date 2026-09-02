import os
import json
import uuid
import time
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_FILE = os.path.join(DATA_DIR, "db.json")
PLAYLISTS_FILE = os.path.join(DATA_DIR, "playlists.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
YTMUSIC_AUTH_FILE = os.path.join(DATA_DIR, "ytmusic_auth.json")

os.makedirs(DATA_DIR, exist_ok=True)

class TrackItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    artist: str
    album: Optional[str] = ""
    source_platform: str = "manual"  # 'spotify' | 'soundcloud' | 'youtube' | 'manual' | 'local'
    source_url: Optional[str] = ""
    thumbnail: Optional[str] = ""
    duration_str: Optional[str] = ""
    main_genre: Optional[str] = "Uncategorized"
    sub_genre: Optional[str] = "General"
    vibe: Optional[str] = ""
    confidence: Optional[float] = 0.0
    matched_yt_id: Optional[str] = None
    matched_yt_title: Optional[str] = None
    is_synced: bool = False
    is_local: bool = False
    file_path: Optional[str] = None
    is_tagged: bool = False
    assigned_playlist: Optional[str] = None
    created_at: float = Field(default_factory=time.time)

class WebPlaylist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    track_ids: List[str] = Field(default_factory=list)
    yt_playlist_id: Optional[str] = None
    yt_playlist_url: Optional[str] = None
    is_synced: bool = False
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)

class AppSettings(BaseModel):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.7-flash"
    playlist_prefix: str = "SoundSort: "
    music_directory: str = ""
    download_directory: str = "downloads"
    ytmusic_is_connected: bool = False

def get_settings() -> AppSettings:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                settings = AppSettings(**data)
                if settings.gemini_model in ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"]:
                    settings.gemini_model = "gemini-3.7-flash"
                return settings
        except Exception:
            pass
    # fallback to env var
    api_key = os.environ.get("GEMINI_API_KEY", "")
    return AppSettings(gemini_api_key=api_key, gemini_model="gemini-3.7-flash")

def save_settings(settings: AppSettings) -> AppSettings:
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2)
    return settings

# -------------------------------------------------------------
# Tracks Store
# -------------------------------------------------------------
def get_all_tracks() -> List[TrackItem]:
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [TrackItem(**item) for item in data]
    except Exception:
        return []

def save_all_tracks(tracks: List[TrackItem]):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump([t.model_dump() for t in tracks], f, indent=2, ensure_ascii=False)

def add_tracks(new_tracks: List[TrackItem]) -> List[TrackItem]:
    current_tracks = get_all_tracks()
    existing_keys = {f"{t.artist.strip().lower()}-{t.title.strip().lower()}" for t in current_tracks}
    
    added = []
    for track in new_tracks:
        key = f"{track.artist.strip().lower()}-{track.title.strip().lower()}"
        if key not in existing_keys:
            current_tracks.append(track)
            existing_keys.add(key)
            added.append(track)
            
    save_all_tracks(current_tracks)
    return added

def update_track(track_id: str, updates: Dict[str, Any]) -> Optional[TrackItem]:
    tracks = get_all_tracks()
    for i, t in enumerate(tracks):
        if t.id == track_id:
            updated_data = t.model_dump()
            updated_data.update(updates)
            updated_track = TrackItem(**updated_data)
            tracks[i] = updated_track
            save_all_tracks(tracks)
            return updated_track
    return None

def bulk_update_subgenre(old_subgenre: str, new_subgenre: str, new_main_genre: Optional[str] = None):
    tracks = get_all_tracks()
    for t in tracks:
        if (t.sub_genre or "").strip().lower() == old_subgenre.strip().lower():
            t.sub_genre = new_subgenre.strip()
            if new_main_genre:
                t.main_genre = new_main_genre.strip()
    save_all_tracks(tracks)

def delete_track(track_id: str) -> bool:
    tracks = get_all_tracks()
    initial_len = len(tracks)
    tracks = [t for t in tracks if t.id != track_id]
    if len(tracks) < initial_len:
        save_all_tracks(tracks)
        # Also clean up from playlists
        pls = get_all_playlists()
        for p in pls:
            if track_id in p.track_ids:
                p.track_ids.remove(track_id)
        save_all_playlists(pls)
        return True
    return False

def clear_all_tracks():
    save_all_tracks([])

# -------------------------------------------------------------
# Playlists Store
# -------------------------------------------------------------
def get_all_playlists() -> List[WebPlaylist]:
    if not os.path.exists(PLAYLISTS_FILE):
        return []
    try:
        with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [WebPlaylist(**item) for item in data]
    except Exception:
        return []

def save_all_playlists(playlists: List[WebPlaylist]):
    with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
        json.dump([p.model_dump() for p in playlists], f, indent=2, ensure_ascii=False)

def get_playlist_by_id(playlist_id: str) -> Optional[WebPlaylist]:
    for p in get_all_playlists():
        if p.id == playlist_id:
            return p
    return None

def create_playlist(title: str, description: str = "", track_ids: Optional[List[str]] = None) -> WebPlaylist:
    playlists = get_all_playlists()
    new_p = WebPlaylist(
        title=title.strip(),
        description=description.strip(),
        track_ids=list(dict.fromkeys(track_ids or []))
    )
    playlists.append(new_p)
    save_all_playlists(playlists)
    return new_p

def update_playlist(playlist_id: str, updates: Dict[str, Any]) -> Optional[WebPlaylist]:
    playlists = get_all_playlists()
    for i, p in enumerate(playlists):
        if p.id == playlist_id:
            data = p.model_dump()
            data.update(updates)
            data["updated_at"] = time.time()
            updated_p = WebPlaylist(**data)
            playlists[i] = updated_p
            save_all_playlists(playlists)
            return updated_p
    return None

def delete_playlist(playlist_id: str) -> bool:
    playlists = get_all_playlists()
    initial_len = len(playlists)
    playlists = [p for p in playlists if p.id != playlist_id]
    if len(playlists) < initial_len:
        save_all_playlists(playlists)
        return True
    return False

def add_tracks_to_playlist(playlist_id: str, track_ids: List[str]) -> Optional[WebPlaylist]:
    playlists = get_all_playlists()
    for i, p in enumerate(playlists):
        if p.id == playlist_id:
            # Preserve existing order and append new without duplicates
            existing = set(p.track_ids)
            for tid in track_ids:
                if tid not in existing:
                    p.track_ids.append(tid)
                    existing.add(tid)
            p.updated_at = time.time()
            save_all_playlists(playlists)
            return p
    return None

def remove_track_from_playlist(playlist_id: str, track_id: str) -> Optional[WebPlaylist]:
    playlists = get_all_playlists()
    for i, p in enumerate(playlists):
        if p.id == playlist_id:
            if track_id in p.track_ids:
                p.track_ids.remove(track_id)
                p.updated_at = time.time()
                save_all_playlists(playlists)
            return p
    return None
