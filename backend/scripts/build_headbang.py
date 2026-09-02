import os
import re
import json
import logging
import requests
from backend.services.storage import get_all_tracks, get_settings, save_all_tracks
from backend.services.ytmusic_sync import YTMusicSyncService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("headbang_builder")

def is_obviously_japanese(t):
    if t.sub_genre and any(k in t.sub_genre.lower() for k in ['j-rock', 'j-metal', 'visual kei', 'anime', 'j-pop']):
        return True
    text = f"{t.artist} {t.title} {t.album}"
    if re.search(r'[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]', text):
        return True
    j_artists = ['radwimps', 'one ok rock', 'babymetal', 'asian kung-fu generation', 'eve', 'yoasobi', 'lisa', 'kana-boon', 'king gnu', 'the oral cigarettes', 'coldrain', 'crossfaith', 'fear, and loathing in las vegas', 'man with a mission', 'spyair', 'flow', 'ling tosite sigure', 'aimer', 'vaundy', 'polkadot stingray', 'siu', 'zutomayo', 'yorushika', 'ado', 'kenshi yonezu', 'band-maid', 'maximum the hormone', 'my first story', 'survive said the prophet', 'sixtones', 'snow man', 'official hige dandism']
    if any(ja in t.artist.lower() for ja in j_artists):
        return True
    return False

def is_obviously_indonesian(t):
    if t.sub_genre and any(k in t.sub_genre.lower() for k in ['indo', 'indonesian', 'dangdut']):
        return True
    indo_artists = ['dewa 19', 'dewa', 'sheila on 7', 'slank', 'burgerkill', 'deadsquad', 'noah', 'peterpan', 'kotak', 'superman is dead', 'sid', 'endank soekamti', 'padi', 'jamrud', 'for revenge', 'reality club', 'efek rumah kaca', 'the adams', '.feast', 'feast', 'hindia', 'kelompok penerbang roket', 'pee wee gaskins', 'killing me inside', 'last child', 'seringai', 'koil', 'rif', 'pas band', 'boomberang', 'netral', 'ntrl', 'rocket rockers', 'morfem', 'sukatani', 'voice of baceprot', 'vob', 'st12', 'kangen band', 'radja', 'jamrud', 'tipe-x', 'shaggydog', 'avhath', 'besok bubar', 'navicula', 'gigi', 'ungu', 'ada band', 'j-rocks', 'barasuara', 'scaller', 'stars and rabbit', 'summerlane', 'revara', 'stand here alone', 'down for life', 'revenge the fate', 'rumahsakit', 'sore', 'bravesboy', 'white shoes', 'mocca', 'payung teduh', 'fourtwnty', 'the sigit', 'eleventwelfth', 'amigdala', 'fiersa besari', 'hivi', 'ran']
    a_lower = t.artist.lower().strip()
    if any(ia == a_lower or ia in a_lower for ia in indo_artists):
        return True
    return False

def build_headbang_playlist():
    all_tracks = get_all_tracks()
    logger.info(f"Total tracks in library: {len(all_tracks)}")

    # 1. Filter out obvious non-rock and obvious JP/ID
    initial_rock = []
    for t in all_tracks:
        is_rock_genre = (t.main_genre and ('rock' in t.main_genre.lower() or 'metal' in t.main_genre.lower())) or (t.sub_genre and any(k in t.sub_genre.lower() for k in [
            'rock', 'metal', 'punk', 'grunge', 'hardcore', 'nu-metal', 
            'post-hardcore', 'deathcore', 'thrash', 'shoegaze', 'emo', 'screamo', 'midwest emo'
        ]))
        if is_rock_genre:
            if not is_obviously_japanese(t) and not is_obviously_indonesian(t):
                initial_rock.append(t)

    logger.info(f"Filtered candidate pool: {len(initial_rock)} tracks.")

    # 2. Batch prompt AI to filter remaining edge cases in batches of 50
    settings = get_settings()
    key = settings.gemini_api_key
    headbang_ids = set()

    for i in range(0, len(initial_rock), 50):
        batch = initial_rock[i:i+50]
        items = [{'id': t.id, 'artist': t.artist, 'title': t.title} for t in batch]
        prompt = (
            "For each artist & song, return a JSON array specifying if the artist is from Japan or Indonesia:\n"
            "[\n"
            '  {"id": "...", "is_from_japan_or_indonesia": false}\n'
            "]\n\n"
            f"Songs:\n{json.dumps(items)}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
        }
        try:
            r = requests.post(url, json=payload, timeout=25)
            if r.status_code == 200:
                classified = json.loads(r.json()['candidates'][0]['content']['parts'][0]['text'])
                for c in classified:
                    if not c.get("is_from_japan_or_indonesia"):
                        headbang_ids.add(c.get("id"))
            else:
                # If API fails, keep non-obviously filtered items
                for t in batch:
                    headbang_ids.add(t.id)
        except Exception as e:
            logger.warning(f"Batch {i} AI check failed: {e}. Keeping batch candidates.")
            for t in batch:
                headbang_ids.add(t.id)

    target_tracks = [t for t in all_tracks if t.id in headbang_ids]
    logger.info(f"Final curated count for 'Headbang': {len(target_tracks)} songs.")

    # 3. Create playlist on YouTube Music
    yt = YTMusicSyncService()
    if not yt.is_authenticated():
        logger.error("YouTube Music is not authenticated. Please connect in Settings.")
        return

    playlist_title = "Headbang"
    playlist_desc = f"Curated Rock & Metal (excl. JP & ID) created by SoundSort AI ({len(target_tracks)} songs)"

    playlist_id = yt.create_or_get_playlist(playlist_title, playlist_desc)
    logger.info(f"Created/found playlist '{playlist_title}' with ID: {playlist_id}")

    # Search & match videos
    video_ids = []
    for idx, t in enumerate(target_tracks):
        # If already matched or has video ID
        v_id = t.matched_yt_id
        if not v_id:
            match = yt.search_best_match(t)
            if match and match[0]:
                v_id = match[0]
                t.matched_yt_id = match[0]
                t.matched_yt_title = match[1]
                t.is_synced = True

        if v_id:
            video_ids.append(v_id)
            if (idx + 1) % 20 == 0 or idx == len(target_tracks) - 1:
                logger.info(f"Matched {idx+1}/{len(target_tracks)} songs...")

    if video_ids:
        # Add items in chunks of 50 to avoid any YT Music payload size limit
        for i in range(0, len(video_ids), 50):
            yt.add_playlist_items(playlist_id, video_ids[i:i+50])
            logger.info(f"Pushed batch {i+1}-{min(i+50, len(video_ids))} to playlist...")

    save_all_tracks(all_tracks)
    playlist_url = f"https://music.youtube.com/playlist?list={playlist_id}"
    print(f"\n==========================================")
    print(f"🎉 PLAYLIST READY!")
    print(f"Title: {playlist_title}")
    print(f"Total Songs: {len(video_ids)}")
    print(f"Link: {playlist_url}")
    print(f"==========================================\n")

if __name__ == "__main__":
    build_headbang_playlist()
