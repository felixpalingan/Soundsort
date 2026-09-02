import os
import re
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp
from backend.services.local_audio import write_tags_to_file

DOWNLOADS_DIR = Path("downloads").resolve()
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

def download_track_audio(track: Dict[str, Any], output_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Download audio for a track using yt-dlp and embed tags with title, artist, and AI genre.
    """
    target_dir = Path(output_dir).resolve() if output_dir else DOWNLOADS_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    title = track.get("title", "Unknown Title")
    artist = track.get("artist", "Unknown Artist")
    album = track.get("album", "")
    genre = track.get("main_genre", "")
    sub_genre = track.get("sub_genre", "") or track.get("assigned_playlist", "")
    vibe = track.get("vibe", "")
    video_id = track.get("matched_yt_id")

    # Determine URL or Search query
    if video_id:
        target_url = f"https://www.youtube.com/watch?v={video_id}"
    elif track.get("source_url") and "youtube.com" in track.get("source_url", ""):
        target_url = track["source_url"]
    else:
        target_url = f"ytsearch1:{artist} - {title} audio"

    # Sanitize output filename
    safe_filename = re.sub(r'[\\/*?:"<>|]', '_', f"{artist} - {title}").strip()
    out_template = str(target_dir / f"{safe_filename}.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': out_template,
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'extract_audio': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    downloaded_file = None

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=True)
            if 'entries' in info:
                info = info['entries'][0]
            
            # Find the generated file
            candidate_mp3 = str(target_dir / f"{safe_filename}.mp3")
            if os.path.exists(candidate_mp3):
                downloaded_file = candidate_mp3
            else:
                # Look for matching file in output dir
                for f in os.listdir(target_dir):
                    if f.startswith(safe_filename):
                        downloaded_file = str(target_dir / f)
                        break

    except Exception as e:
        # Fallback without FFmpeg conversion if ffmpeg is missing
        print(f"FFmpeg extract failed, trying direct best audio download: {e}")
        ydl_opts_fallback = {
            'format': 'bestaudio/best',
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts_fallback) as ydl:
                info = ydl.extract_info(target_url, download=True)
                for f in os.listdir(target_dir):
                    if f.startswith(safe_filename):
                        downloaded_file = str(target_dir / f)
                        break
        except Exception as fallback_err:
            raise RuntimeError(f"Download failed for {artist} - {title}: {fallback_err}")

    if not downloaded_file or not os.path.exists(downloaded_file):
        raise RuntimeError(f"Downloaded file not found on disk for {artist} - {title}")

    # Embed AI tags to the downloaded file
    try:
        write_tags_to_file(
            file_path=downloaded_file,
            title=title,
            artist=artist,
            genre=genre,
            sub_genre=sub_genre,
            album=album,
            vibe=vibe
        )
    except Exception as tag_err:
        print(f"Warning: could not write tags after download: {tag_err}")

    return {
        "success": True,
        "track_id": track.get("id"),
        "title": title,
        "artist": artist,
        "file_path": downloaded_file,
        "filename": os.path.basename(downloaded_file),
        "genre": genre,
        "sub_genre": sub_genre
    }
