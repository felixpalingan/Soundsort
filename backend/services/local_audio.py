import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TCON, TIT1, COMM, APIC
from mutagen.flac import FLAC
from mutagen.mp4 import MP4, MP4Cover
from mutagen.oggvorbis import OggVorbis

SUPPORTED_AUDIO_EXTENSIONS = {'.mp3', '.flac', '.m4a', '.mp4', '.ogg', '.opus', '.wav'}

def scan_local_directory(dir_path: str) -> List[Dict[str, Any]]:
    """
    Recursively scan a directory for audio files and extract metadata.
    """
    results = []
    path = Path(dir_path).resolve()
    if not path.exists() or not path.is_dir():
        raise ValueError(f"Directory not found: {dir_path}")

    for root, _, files in os.walk(path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_AUDIO_EXTENSIONS:
                full_path = os.path.join(root, file)
                meta = extract_audio_metadata(full_path)
                if meta:
                    results.append(meta)
    return results

def extract_audio_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extract title, artist, album, genre from local audio file using mutagen.
    """
    filename = os.path.basename(file_path)
    stem, ext = os.path.splitext(filename)
    
    # Default fallbacks parsed from filename "Artist - Title" or "Title"
    default_artist = "Unknown Artist"
    default_title = stem
    if " - " in stem:
        parts = stem.split(" - ", 1)
        default_artist = parts[0].strip()
        default_title = parts[1].strip()

    title = default_title
    artist = default_artist
    album = ""
    genre = ""

    try:
        audio = mutagen.File(file_path, easy=True)
        if audio:
            if 'title' in audio and audio['title']:
                title = str(audio['title'][0]).strip() or default_title
            if 'artist' in audio and audio['artist']:
                artist = str(audio['artist'][0]).strip() or default_artist
            if 'album' in audio and audio['album']:
                album = str(audio['album'][0]).strip()
            if 'genre' in audio and audio['genre']:
                genre = str(audio['genre'][0]).strip()
    except Exception as e:
        print(f"Error reading tags from {file_path}: {e}")

    # Generate deterministic track ID from file path
    import hashlib
    track_id = f"local_{hashlib.md5(file_path.encode('utf-8', errors='ignore')).hexdigest()[:12]}"

    return {
        "id": track_id,
        "title": title,
        "artist": artist,
        "album": album,
        "file_path": file_path,
        "is_local": True,
        "existing_genre": genre,
        "sub_genre": genre or "Uncategorized",
        "main_genre": "Other",
        "assigned_playlist": genre or "",
        "vibe": "",
        "thumbnail": ""
    }

def write_tags_to_file(file_path: str, title: str, artist: str, genre: str, sub_genre: str = "", album: str = "", vibe: str = "") -> bool:
    """
    Write tags directly to an audio file on disk (.mp3, .flac, .m4a, .ogg).
    """
    if not os.path.exists(file_path):
        return False

    ext = os.path.splitext(file_path)[1].lower()
    genre_tag = sub_genre or genre

    try:
        if ext == '.mp3':
            # Write ID3 tags
            try:
                tags = ID3(file_path)
            except Exception:
                tags = ID3()

            tags['TIT2'] = TIT2(encoding=3, text=[title])
            tags['TPE1'] = TPE1(encoding=3, text=[artist])
            if album:
                tags['TALB'] = TALB(encoding=3, text=[album])
            if genre_tag:
                tags['TCON'] = TCON(encoding=3, text=[genre_tag])
            if genre:
                tags['TIT1'] = TIT1(encoding=3, text=[genre])  # Grouping / Main Genre
            if vibe:
                tags['COMM'] = COMM(encoding=3, lang='eng', desc='SoundSort Vibe', text=[f"SoundSort AI | {vibe}"])
            tags.save(file_path, v2_version=3)
            return True

        elif ext == '.flac':
            audio = FLAC(file_path)
            audio['title'] = [title]
            audio['artist'] = [artist]
            if album:
                audio['album'] = [album]
            if genre_tag:
                audio['genre'] = [genre_tag]
            if genre:
                audio['grouping'] = [genre]
            if vibe:
                audio['comment'] = [f"SoundSort AI | {vibe}"]
            audio.save()
            return True

        elif ext in ['.m4a', '.mp4']:
            audio = MP4(file_path)
            audio['\xa9nam'] = [title]
            audio['\xa9ART'] = [artist]
            if album:
                audio['\xa9alb'] = [album]
            if genre_tag:
                audio['\xa9gen'] = [genre_tag]
            if vibe:
                audio['\xa9cmt'] = [f"SoundSort AI | {vibe}"]
            audio.save()
            return True

        elif ext in ['.ogg', '.opus']:
            audio = OggVorbis(file_path)
            audio['title'] = [title]
            audio['artist'] = [artist]
            if album:
                audio['album'] = [album]
            if genre_tag:
                audio['genre'] = [genre_tag]
            audio.save()
            return True

    except Exception as e:
        print(f"Failed to write tags to {file_path}: {e}")
        return False

    return False

def organize_files_by_genre(tracks: List[Dict[str, Any]], target_base_dir: str, copy_instead_of_move: bool = False) -> Dict[str, Any]:
    """
    Organize local audio files into folders categorized by their genre/subgenre.
    Target structure: target_base_dir / [Genre Name] / [Artist - Title.ext]
    """
    import shutil

    base_path = Path(target_base_dir).resolve()
    base_path.mkdir(parents=True, exist_ok=True)

    moved_count = 0
    errors = []

    for tr in tracks:
        src = tr.get('file_path')
        if not src or not os.path.exists(src):
            continue

        genre_folder = tr.get('assigned_playlist') or tr.get('sub_genre') or tr.get('main_genre') or "Uncategorized"
        # Sanitize folder name
        safe_folder = re.sub(r'[\\/*?:"<>|]', '_', genre_folder).strip() or "Uncategorized"
        genre_dir = base_path / safe_folder
        genre_dir.mkdir(parents=True, exist_ok=True)

        filename = os.path.basename(src)
        dest = genre_dir / filename

        try:
            if copy_instead_of_move:
                shutil.copy2(src, dest)
            else:
                shutil.move(src, dest)
                tr['file_path'] = str(dest)
            moved_count += 1
        except Exception as e:
            errors.append(f"{filename}: {str(e)}")

    return {
        "success": True,
        "moved_count": moved_count,
        "target_directory": str(base_path),
        "errors": errors
    }
