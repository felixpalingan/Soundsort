import os
import re
import json
import logging
import time
from typing import List, Dict, Any
from backend.services.storage import get_all_tracks, save_all_tracks, get_settings
from backend.services.ytmusic_sync import YTMusicSyncService
from backend.services.ai_classifier import AIClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reclassify_and_rebuild")

def reclassify_all_tracks():
    tracks = get_all_tracks()
    logger.info(f"Loaded {len(tracks)} tracks for full re-classification.")
    settings = get_settings()
    key = settings.gemini_api_key
    preferred_model = settings.gemini_model or "gemini-3.5-flash-lite"
    if not key:
        raise ValueError("Gemini API Key missing.")

    classifier = AIClassifier(api_key=key, model=preferred_model)
    batch_size = 100
    total = len(tracks)

    for i in range(0, total, batch_size):
        batch = tracks[i:i+batch_size]
        try:
            classified, model_used = classifier.classify_single_batch(batch, key, preferred_model)
            for item in classified:
                idx = item.get("index")
                if idx is not None and 0 <= idx < len(batch):
                    batch[idx].main_genre = item.get("main_genre", "Electronic / Dance")
                    batch[idx].sub_genre = item.get("sub_genre", "General")
                    batch[idx].vibe = item.get("vibe", "")
            logger.info(f"[{model_used}] Classified batch {i+1}-{min(i+batch_size, total)} / {total} tracks ({int(min(i+batch_size, total)/total*100)}%)")
        except Exception as e:
            logger.warning(f"Batch {i} error: {e}")

        time.sleep(1.5)

    save_all_tracks(tracks)
    logger.info("Saved all re-classified tracks to database!")
    return tracks

def is_japanese_or_indonesian(t):
    text = f"{t.artist} {t.title} {t.album}"
    if re.search(r'[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]', text):
        return True
    j_artists = ['radwimps', 'one ok rock', 'babymetal', 'asian kung-fu generation', 'eve', 'yoasobi', 'lisa', 'kana-boon', 'king gnu', 'the oral cigarettes', 'coldrain', 'crossfaith', 'fear, and loathing in las vegas', 'man with a mission', 'spyair', 'flow', 'ling tosite sigure', 'aimer', 'vaundy', 'polkadot stingray', 'siu', 'zutomayo', 'yorushika', 'ado', 'kenshi yonezu', 'band-maid', 'maximum the hormone', 'my first story', 'survive said the prophet', 'sixtones', 'snow man', 'official hige dandism']
    indo_artists = ['dewa 19', 'dewa', 'sheila on 7', 'slank', 'burgerkill', 'deadsquad', 'noah', 'peterpan', 'kotak', 'superman is dead', 'sid', 'endank soekamti', 'padi', 'jamrud', 'for revenge', 'reality club', 'efek rumah kaca', 'the adams', '.feast', 'feast', 'hindia', 'kelompok penerbang roket', 'pee wee gaskins', 'killing me inside', 'last child', 'seringai', 'koil', 'rif', 'pas band', 'boomberang', 'netral', 'ntrl', 'rocket rockers', 'morfem', 'sukatani', 'voice of baceprot', 'vob', 'st12', 'kangen band', 'radja', 'jamrud', 'tipe-x', 'shaggydog', 'avhath', 'besok bubar', 'navicula', 'gigi', 'ungu', 'ada band', 'j-rocks', 'barasuara', 'scaller', 'stars and rabbit', 'summerlane', 'revara', 'stand here alone', 'down for life', 'revenge the fate', 'rumahsakit', 'sore', 'bravesboy', 'white shoes', 'mocca', 'payung teduh', 'fourtwnty', 'the sigit', 'eleventwelfth', 'amigdala', 'fiersa besari', 'hivi', 'ran']
    a_lower = t.artist.lower().strip()
    if any(ja in a_lower for ja in j_artists) or any(ia == a_lower or ia in a_lower for ia in indo_artists):
        return True
    return False

def sync_playlist(yt, title, desc, tracks):
    if not tracks:
        logger.warning(f"No tracks for '{title}'")
        return {"title": title, "count": 0, "url": None}
    playlist_id = yt.create_or_get_playlist(title, desc)
    video_ids = []
    for t in tracks:
        vid = t.matched_yt_id
        if not vid:
            match = yt.search_best_match(t)
            if match and match[0]:
                vid = match[0]
                t.matched_yt_id = match[0]
                t.matched_yt_title = match[1]
                t.is_synced = True
        if vid:
            video_ids.append(vid)

    if video_ids:
        for i in range(0, len(video_ids), 50):
            try:
                yt.add_playlist_items(playlist_id, video_ids[i:i+50])
            except Exception as e:
                logger.error(f"Error adding to {title}: {e}")

    url = f"https://music.youtube.com/playlist?list={playlist_id}"
    logger.info(f"Synced '{title}': {len(video_ids)} songs -> {url}")
    return {"title": title, "count": len(video_ids), "url": url}

def rebuild_all_playlists():
    tracks = get_all_tracks()
    yt = YTMusicSyncService()
    if not yt.is_authenticated():
        logger.error("YouTube Music not authenticated.")
        return

    # 1. PURE HEADBANG ROCK (Metal, Nu-Metal, Metalcore, Thrash, Heavy Rock, Grunge, Post-Hardcore, Hardcore Punk - EXCL JP & ID)
    # Exclude Happy Hardcore / Electronic / Acoustic / Soft Indie
    headbang_subgenres = [
        'nu-metal', 'heavy metal', 'metalcore', 'thrash metal', 'death metal', 
        'deathcore', 'post-hardcore', 'industrial metal', 'hardcore punk', 
        'grunge', 'hard rock', 'alternative metal', 'sludge', 'groove metal'
    ]
    def is_headbang(t):
        if is_japanese_or_indonesian(t): return False
        # Must not be electronic or dance
        if t.main_genre in ["Electronic / Dance", "Breakbeat", "Breakcore", "Funk / Baile", "Pop", "Ambient / Chill", "Hip-Hop / Rap"]:
            return False
        # Metal / Hardcore main genre
        if t.main_genre == "Metal / Hardcore":
            return True
        # Or specifically heavy subgenres
        if t.sub_genre and any(k == t.sub_genre.lower() or k in t.sub_genre.lower() for k in headbang_subgenres):
            v = (t.vibe or '').lower()
            if any(s in v for s in ['acoustic', 'chill', 'dreamy', 'ambient', 'soft']):
                return False
            return True
        return False

    headbang_tracks = [t for t in tracks if is_headbang(t)]

    # 2. RAVE & HIGH ENERGY (Techno, Hardstyle, Hardcore Techno, Trance, Frenchcore, Jumpstyle, Eurodance, Club)
    def is_rave(t):
        if t.main_genre == "Electronic / Dance":
            sg = (t.sub_genre or '').lower()
            if any(k in sg for k in ['techno', 'hardstyle', 'frenchcore', 'jumpstyle', 'trance', 'hardcore', 'eurodance', 'club', 'rawstyle', 'hard dance', 'psytrance', 'nightcore']):
                return True
        return False

    rave_tracks = [t for t in tracks if is_rave(t)]

    # 3. BREAKBEAT
    breakbeat_tracks = [t for t in tracks if t.main_genre == "Breakbeat" or (t.sub_genre and 'breakbeat' in t.sub_genre.lower())]

    # 4. FUNK / BRAZILIAN FUNK
    funk_tracks = [t for t in tracks if t.main_genre == "Funk / Baile" or (t.sub_genre and any(k in t.sub_genre.lower() for k in ['funk', 'baile', 'funkot']))]

    # 5. BREAKCORE
    breakcore_tracks = [t for t in tracks if t.main_genre == "Breakcore" or (t.sub_genre and 'breakcore' in t.sub_genre.lower())]

    logger.info(f"\n==========================================")
    logger.info(f"TARGET PLAYLIST COUNTS:")
    logger.info(f" - Headbang (Pure Heavy Rock/Metal): {len(headbang_tracks)}")
    logger.info(f" - Rave & High Energy: {len(rave_tracks)}")
    logger.info(f" - Breakbeat: {len(breakbeat_tracks)}")
    logger.info(f" - Funk / Brazilian Funk: {len(funk_tracks)}")
    logger.info(f" - Breakcore: {len(breakcore_tracks)}")
    logger.info(f"==========================================\n")

    res = []
    res.append(sync_playlist(yt, "Headbang", f"Pure Heavy Rock & Metal (excl. JP/ID) by SoundSort AI ({len(headbang_tracks)} tracks)", headbang_tracks))
    res.append(sync_playlist(yt, "Rave & High Energy (Techno / Hardstyle)", f"High Energy Rave, Techno, Hardstyle & Trance by SoundSort AI ({len(rave_tracks)} tracks)", rave_tracks))
    res.append(sync_playlist(yt, "Breakbeat", f"Curated Breakbeat by SoundSort AI ({len(breakbeat_tracks)} tracks)", breakbeat_tracks))
    res.append(sync_playlist(yt, "Funk & Brazilian Funk", f"Curated Funk, Baile Funk & Brazilian Phonk by SoundSort AI ({len(funk_tracks)} tracks)", funk_tracks))
    res.append(sync_playlist(yt, "Breakcore", f"Curated Breakcore & Amen chops by SoundSort AI ({len(breakcore_tracks)} tracks)", breakcore_tracks))

    save_all_tracks(tracks)
    logger.info("ALL PLAYLISTS REBUILT SUCCESSFULLY!")

def main():
    logger.info("=== STEP 1: RE-CLASSIFYING ALL TRACKS WITH STRICT PROMPT ===")
    reclassify_all_tracks()
    logger.info("\n=== STEP 2: REBUILDING ALL PLAYLISTS ===")
    rebuild_all_playlists()

if __name__ == "__main__":
    main()
