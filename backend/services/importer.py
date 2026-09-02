import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
import requests
import yt_dlp

from backend.services.storage import TrackItem

logger = logging.getLogger(__name__)

# Helper to clean titles (e.g. remove "Official Video", "(Official Audio)", "[HQ]", etc.)
CLEANUP_REGEX = re.compile(
    r"(\[.*?\]|\(.*?\))", re.IGNORECASE
)
JUNK_PHRASES = [
    "official video", "official audio", "official music video", "lyric video", 
    "lyrics", "visualizer", "hd", "4k", "hq", "audio", "video", "clip officiel"
]

def clean_track_metadata(title: str, artist: str) -> (str, str):
    cleaned_title = title.strip()
    cleaned_artist = artist.strip()

    # If title has "Artist - Song", split it
    if " - " in cleaned_title and (not cleaned_artist or cleaned_artist.lower() in ["various artists", "unknown", "sound", "music", "topic"]):
        parts = cleaned_title.split(" - ", 1)
        cleaned_artist = parts[0].strip()
        cleaned_title = parts[1].strip()

    # Remove phrases in brackets/parentheses that are just junk like "(Official Music Video)"
    def remove_junk(match):
        content = match.group(0)
        inner = content[1:-1].strip().lower()
        if any(junk in inner for junk in JUNK_PHRASES):
            return ""
        return content

    cleaned_title = CLEANUP_REGEX.sub(remove_junk, cleaned_title).strip()
    cleaned_title = re.sub(r"\s+", " ", cleaned_title).strip()

    # Clean artist " - Topic" from YouTube Music
    if cleaned_artist.endswith(" - Topic"):
        cleaned_artist = cleaned_artist[:-8].strip()

    return cleaned_title or title, cleaned_artist or artist or "Unknown Artist"


import io
import csv

class MusicImporter:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

    def parse_csv(self, csv_content: str) -> List[TrackItem]:
        """
        Parses CSV data from Exportify, Spotify, Soundiiz, TuneMyMusic, or custom music CSVs.
        """
        results: List[TrackItem] = []
        try:
            sample = csv_content[:2048]
            delimiter = ","
            if ";" in sample and sample.count(";") > sample.count(","):
                delimiter = ";"
            elif "\t" in sample and sample.count("\t") > sample.count(","):
                delimiter = "\t"

            reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
            
            for row in reader:
                if not row:
                    continue
                # Normalize keys (strip whitespace)
                clean_row = {k.strip(): (v.strip() if v else "") for k, v in row.items() if k}

                # Find track title column
                title = ""
                for col in ["Track Name", "track_name", "Title", "title", "Track", "track", "Song Name", "song_name", "Song", "Name", "name"]:
                    if col in clean_row and clean_row[col]:
                        title = clean_row[col]
                        break
                
                # Find artist column
                artist = ""
                for col in ["Artist Name(s)", "Artist Name", "artist_name", "Artist", "artist", "Artists", "artists", "Performer"]:
                    if col in clean_row and clean_row[col]:
                        artist = clean_row[col]
                        break

                # Find album column
                album = ""
                for col in ["Album Name", "album_name", "Album", "album"]:
                    if col in clean_row and clean_row[col]:
                        album = clean_row[col]
                        break

                # Find URL column
                url = ""
                for col in ["Track URI", "URL", "url", "Spotify URI", "Track Link", "Link"]:
                    if col in clean_row and clean_row[col]:
                        url = clean_row[col]
                        if url.startswith("spotify:track:"):
                            url = f"https://open.spotify.com/track/{url.split(':')[-1]}"
                        break

                # Duration
                dur_str = ""
                dur_ms_str = clean_row.get("Track Duration (ms)") or clean_row.get("Duration (ms)") or clean_row.get("Duration")
                if dur_ms_str and dur_ms_str.isdigit():
                    dur_ms = int(dur_ms_str)
                    dur_str = f"{dur_ms//60000}:{(dur_ms%60000)//1000:02d}"

                if title:
                    c_title, c_artist = clean_track_metadata(title, artist)
                    results.append(TrackItem(
                        title=c_title,
                        artist=c_artist,
                        album=album,
                        duration_str=dur_str,
                        source_platform="spotify" if "spotify" in url or "spotify" in str(clean_row).lower() else "manual",
                        source_url=url
                    ))
        except Exception as e:
            logger.error(f"Error parsing CSV content: {e}")
            
        return results

    def parse_input(self, text_or_urls: str) -> List[TrackItem]:
        """
        Accepts multi-line text that can contain URLs, CSV data, or track titles.
        Returns a list of extracted TrackItem objects.
        """
        # Auto-detect if user pasted full CSV (contains header keywords like Track Name, Artist Name, Title, Artist)
        first_line = text_or_urls.strip().splitlines()[0] if text_or_urls.strip().splitlines() else ""
        if ("," in first_line or ";" in first_line) and any(kw in first_line.lower() for kw in ["track name", "artist", "title", "track uri", "album"]):
            csv_results = self.parse_csv(text_or_urls)
            if csv_results:
                return csv_results

        lines = [line.strip() for line in text_or_urls.strip().splitlines() if line.strip()]
        results: List[TrackItem] = []

        for line in lines:
            if re.match(r"^https?://", line, re.IGNORECASE):
                url = line
                try:
                    if "spotify.com" in url:
                        results.extend(self._import_spotify(url))
                    elif "soundcloud.com" in url:
                        results.extend(self._import_soundcloud(url))
                    elif "youtube.com" in url or "youtu.be" in url:
                        results.extend(self._import_youtube(url))
                    else:
                        # General yt-dlp fallback
                        results.extend(self._import_with_ytdlp(url, "generic"))
                except Exception as e:
                    logger.error(f"Error extracting from {url}: {e}")
            else:
                # Raw text format (e.g. "Fred again.. - Delilah", "1. Skrillex - Rumble")
                track = self._parse_text_line(line)
                if track:
                    results.append(track)

        return results

    def _parse_text_line(self, line: str) -> Optional[TrackItem]:
        # Strip numbering e.g. "1. " or "01 - "
        cleaned = re.sub(r"^\d+[\.\-\)]\s*", "", line).strip()
        if not cleaned:
            return None

        artist = "Unknown Artist"
        title = cleaned

        if " - " in cleaned:
            parts = cleaned.split(" - ", 1)
            artist = parts[0].strip()
            title = parts[1].strip()
        elif " by " in cleaned.lower():
            parts = re.split(r"\s+by\s+", cleaned, flags=re.IGNORECASE)
            title = parts[0].strip()
            artist = parts[1].strip()

        cleaned_title, cleaned_artist = clean_track_metadata(title, artist)
        return TrackItem(
            title=cleaned_title,
            artist=cleaned_artist,
            source_platform="manual",
            source_url=""
        )

    def _import_spotify(self, url: str) -> List[TrackItem]:
        tracks: List[TrackItem] = []
        
        # 1. Try Spotify Web anonymous token API
        try:
            token_resp = self.session.get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", timeout=8)
            if token_resp.status_code == 200:
                token_data = token_resp.json()
                access_token = token_data.get("accessToken")
                if access_token:
                    headers = {"Authorization": f"Bearer {access_token}"}
                    
                    # Playlist
                    playlist_match = re.search(r"playlist/([a-zA-Z0-9]+)", url)
                    if playlist_match:
                        p_id = playlist_match.group(1)
                        api_url = f"https://api.spotify.com/v1/playlists/{p_id}/tracks?limit=100"
                        while api_url:
                            resp = self.session.get(api_url, headers=headers, timeout=10)
                            if resp.status_code != 200:
                                break
                            data = resp.json()
                            items = data.get("items", [])
                            for item in items:
                                tr = item.get("track")
                                if not tr or not tr.get("name"):
                                    continue
                                artist_names = ", ".join([a["name"] for a in tr.get("artists", [])]) or "Unknown Artist"
                                album_name = tr.get("album", {}).get("name", "")
                                images = tr.get("album", {}).get("images", [])
                                thumb = images[0]["url"] if images else ""
                                dur_ms = tr.get("duration_ms", 0)
                                dur_str = f"{dur_ms//60000}:{(dur_ms%60000)//1000:02d}" if dur_ms else ""
                                
                                c_title, c_artist = clean_track_metadata(tr["name"], artist_names)
                                tracks.append(TrackItem(
                                    title=c_title,
                                    artist=c_artist,
                                    album=album_name,
                                    thumbnail=thumb,
                                    duration_str=dur_str,
                                    source_platform="spotify",
                                    source_url=tr.get("external_urls", {}).get("spotify", url)
                                ))
                            api_url = data.get("next")
                        if tracks:
                            return tracks

                    # Album
                    album_match = re.search(r"album/([a-zA-Z0-9]+)", url)
                    if album_match:
                        a_id = album_match.group(1)
                        resp = self.session.get(f"https://api.spotify.com/v1/albums/{a_id}", headers=headers, timeout=10)
                        if resp.status_code == 200:
                            data = resp.json()
                            album_name = data.get("name", "")
                            images = data.get("images", [])
                            thumb = images[0]["url"] if images else ""
                            for tr in data.get("tracks", {}).get("items", []):
                                artist_names = ", ".join([a["name"] for a in tr.get("artists", [])]) or "Unknown Artist"
                                dur_ms = tr.get("duration_ms", 0)
                                dur_str = f"{dur_ms//60000}:{(dur_ms%60000)//1000:02d}" if dur_ms else ""
                                c_title, c_artist = clean_track_metadata(tr["name"], artist_names)
                                tracks.append(TrackItem(
                                    title=c_title,
                                    artist=c_artist,
                                    album=album_name,
                                    thumbnail=thumb,
                                    duration_str=dur_str,
                                    source_platform="spotify",
                                    source_url=tr.get("external_urls", {}).get("spotify", url)
                                ))
                        if tracks:
                            return tracks

                    # Track
                    track_match = re.search(r"track/([a-zA-Z0-9]+)", url)
                    if track_match:
                        t_id = track_match.group(1)
                        resp = self.session.get(f"https://api.spotify.com/v1/tracks/{t_id}", headers=headers, timeout=10)
                        if resp.status_code == 200:
                            tr = resp.json()
                            artist_names = ", ".join([a["name"] for a in tr.get("artists", [])]) or "Unknown Artist"
                            images = tr.get("album", {}).get("images", [])
                            thumb = images[0]["url"] if images else ""
                            dur_ms = tr.get("duration_ms", 0)
                            dur_str = f"{dur_ms//60000}:{(dur_ms%60000)//1000:02d}" if dur_ms else ""
                            c_title, c_artist = clean_track_metadata(tr["name"], artist_names)
                            return [TrackItem(
                                title=c_title,
                                artist=c_artist,
                                album=tr.get("album", {}).get("name", ""),
                                thumbnail=thumb,
                                duration_str=dur_str,
                                source_platform="spotify",
                                source_url=tr.get("external_urls", {}).get("spotify", url)
                            )]
        except Exception as e:
            logger.warning(f"Spotify Web API parse failed: {e}. Trying fallback oEmbed / embed parser.")

        # 2. Fallback: Spotify Embed HTML parsing
        try:
            embed_url = url.replace("open.spotify.com/", "open.spotify.com/embed/")
            resp = self.session.get(embed_url, timeout=10)
            if resp.status_code == 200:
                match = re.search(r'<script id="__NEXT_DATA__" type="application/json">({.*?})</script>', resp.text)
                if match:
                    next_data = json.loads(match.group(1))
                    entity = next_data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
                    track_list = entity.get("trackList", [])
                    for item in track_list:
                        raw_title = item.get("title", "")
                        raw_artist = item.get("subtitle", "")
                        dur_ms = item.get("duration", 0)
                        dur_str = f"{dur_ms//60000}:{(dur_ms%60000)//1000:02d}" if dur_ms else ""
                        c_title, c_artist = clean_track_metadata(raw_title, raw_artist)
                        tracks.append(TrackItem(
                            title=c_title,
                            artist=c_artist,
                            source_platform="spotify",
                            source_url=f"https://open.spotify.com/track/{item.get('uri', '').split(':')[-1]}" if item.get("uri") else url,
                            duration_str=dur_str
                        ))
                    if tracks:
                        return tracks
        except Exception as e:
            logger.warning(f"Spotify embed parser failed: {e}")

        # 3. Fallback: oEmbed
        try:
            oembed_resp = self.session.get(f"https://open.spotify.com/oembed?url={url}", timeout=5)
            if oembed_resp.status_code == 200:
                data = oembed_resp.json()
                title_str = data.get("title", "")
                c_title, c_artist = clean_track_metadata(title_str, "")
                tracks.append(TrackItem(
                    title=c_title,
                    artist=c_artist,
                    thumbnail=data.get("thumbnail_url", ""),
                    source_platform="spotify",
                    source_url=url
                ))
        except Exception:
            pass

        return tracks

    def _import_soundcloud(self, url: str) -> List[TrackItem]:
        """
        Extract song metadata from SoundCloud track or set URL using oEmbed API & yt-dlp fallback.
        """
        import urllib.request
        import urllib.parse
        import json

        # 1. Official SoundCloud oEmbed API
        try:
            oembed_url = f"https://soundcloud.com/oembed?url={urllib.parse.quote(url)}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    raw_title = data.get("title", "")
                    author = data.get("author_name", "Unknown Artist")
                    thumb = data.get("thumbnail_url", "")
                    # SoundCloud oEmbed title is often "Song Title by Artist"
                    if f" by {author}".lower() in raw_title.lower():
                        clean_raw = re.sub(rf"\s+by\s+{re.escape(author)}$", "", raw_title, flags=re.IGNORECASE)
                    else:
                        clean_raw = raw_title
                    c_title, c_artist = clean_track_metadata(clean_raw, author)
                    return [TrackItem(
                        title=c_title,
                        artist=c_artist,
                        thumbnail=thumb,
                        source_platform="soundcloud",
                        source_url=url
                    )]
        except Exception as e_oe:
            logger.warning(f"SoundCloud oEmbed failed for {url}: {e_oe}")

        # 2. Fallback to yt-dlp
        return self._import_with_ytdlp(url, "soundcloud")

    def _import_youtube(self, url: str) -> List[TrackItem]:
        # 1. Check if URL is a YouTube / YouTube Music playlist or mix
        playlist_match = re.search(r"list=([a-zA-Z0-9_-]+)", url)
        if playlist_match:
            playlist_id = playlist_match.group(1)
            try:
                from ytmusicapi import YTMusic
                auth_file = None
                for cand in ["backend/data/ytmusic_auth.json", "data/ytmusic_auth.json", "oauth.json"]:
                    if os.path.exists(cand):
                        auth_file = cand
                        break

                yt_inst = YTMusic(auth_file) if auth_file else YTMusic()
                res = yt_inst.get_playlist(playlist_id, limit=None)
                tracks_data = res.get("tracks", []) if res else []
                if tracks_data:
                    tracks: List[TrackItem] = []
                    for t in tracks_data:
                        if not t or not t.get("title"):
                            continue
                        artists = ", ".join([a.get("name", "") for a in t.get("artists", []) if a.get("name")]) or "Unknown Artist"
                        album = t.get("album", {}).get("name", "") if t.get("album") else ""
                        thumb = t.get("thumbnails", [{}])[0].get("url", "") if t.get("thumbnails") else ""
                        dur_str = t.get("duration", "")
                        c_title, c_artist = clean_track_metadata(t.get("title", ""), artists)
                        v_id = t.get("videoId")
                        t_url = f"https://music.youtube.com/watch?v={v_id}" if v_id else url
                        tracks.append(TrackItem(
                            title=c_title,
                            artist=c_artist,
                            album=album,
                            thumbnail=thumb,
                            duration_str=dur_str,
                            source_platform="youtube",
                            source_url=t_url,
                            matched_yt_id=v_id,
                            matched_yt_title=t.get("title")
                        ))
                    if tracks:
                        logger.info(f"Successfully extracted {len(tracks)} songs from YouTube playlist {playlist_id}")
                        return tracks
            except Exception as e:
                logger.warning(f"ytmusicapi playlist extraction for {playlist_id} failed: {e}. Trying fallback...")

        # 2. Check if single YouTube video URL - Use reliable YouTube oEmbed API first
        video_match = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)([a-zA-Z0-9_-]{11})", url)
        if video_match:
            v_id = video_match.group(1)
            try:
                import urllib.request
                import urllib.parse
                clean_watch_url = f"https://www.youtube.com/watch?v={v_id}"
                oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(clean_watch_url)}&format=json"
                req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode())
                        raw_title = data.get("title", "")
                        author = data.get("author_name", "Unknown Artist")
                        thumb = data.get("thumbnail_url", f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg")
                        c_title, c_artist = clean_track_metadata(raw_title, author)
                        return [TrackItem(
                            title=c_title,
                            artist=c_artist,
                            thumbnail=thumb,
                            source_platform="youtube",
                            source_url=clean_watch_url,
                            matched_yt_id=v_id,
                            matched_yt_title=raw_title
                        )]
            except Exception as e_oe:
                logger.warning(f"YouTube oEmbed extraction failed for {v_id}: {e_oe}")

        return self._import_with_ytdlp(url, "youtube")

    def _import_with_ytdlp(self, url: str, platform: str) -> List[TrackItem]:
        ydl_opts = {
            "extract_flat": True,
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "ignoreerrors": True,
        }
        tracks: List[TrackItem] = []
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return tracks

            entries = info.get("entries")
            if entries:  # Playlist or Set
                for entry in entries:
                    if not entry:
                        continue
                    title = entry.get("title", "")
                    uploader = entry.get("uploader") or entry.get("artist") or entry.get("channel") or "Unknown Artist"
                    dur = entry.get("duration")
                    dur_str = f"{int(dur)//60}:{int(dur)%60:02d}" if dur else ""
                    thumb = entry.get("thumbnail") or (entry.get("thumbnails", [{}])[0].get("url") if entry.get("thumbnails") else "")
                    track_url = entry.get("url") or entry.get("webpage_url") or url
                    if not track_url.startswith("http"):
                        if platform == "youtube" and entry.get("id"):
                            track_url = f"https://www.youtube.com/watch?v={entry.get('id')}"

                    c_title, c_artist = clean_track_metadata(title, uploader)
                    tracks.append(TrackItem(
                        title=c_title,
                        artist=c_artist,
                        duration_str=dur_str,
                        thumbnail=thumb or "",
                        source_platform=platform,
                        source_url=track_url,
                        matched_yt_id=entry.get("id") if platform == "youtube" else None
                    ))
            else:  # Single Track
                title = info.get("title", "")
                uploader = info.get("uploader") or info.get("artist") or info.get("channel") or "Unknown Artist"
                dur = info.get("duration")
                dur_str = f"{int(dur)//60}:{int(dur)%60:02d}" if dur else ""
                thumb = info.get("thumbnail") or ""
                track_url = info.get("webpage_url") or url
                c_title, c_artist = clean_track_metadata(title, uploader)
                tracks.append(TrackItem(
                    title=c_title,
                    artist=c_artist,
                    duration_str=dur_str,
                    thumbnail=thumb,
                    source_platform=platform,
                    source_url=track_url,
                    matched_yt_id=info.get("id") if platform == "youtube" else None
                ))

        return tracks
