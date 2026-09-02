import os
import re
import json
import logging
import time
from typing import List, Dict, Any
import requests
from backend.services.storage import get_all_tracks, save_all_tracks, get_settings
from backend.services.ytmusic_sync import YTMusicSyncService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("classify_by_playlists")

PLAYLIST_SYSTEM_PROMPT = """You are an expert musicological curator. Your task is to assign each song strictly into EXACTLY ONE of the 10 target playlist buckets below, or tag it as 'SKIP' if it does not fit any of them.

TARGET PLAYLISTS:
1. "Hard Rock & Metal"
   - Heavy Metal, Nu-Metal (Slipknot, Korn, System of a Down, Limp Bizkit, Deftones heavy tracks), Thrash Metal (Metallica, Megadeth, Slayer), Metalcore (BMTH, A Day To Remember, Asking Alexandria, Bullet For My Valentine), Deathcore, Hard Rock (Guns N' Roses, AC/DC, Led Zeppelin), Post-Hardcore, Industrial Metal (Rammstein).
   - STRICT EXCLUSIONS: NO Indonesian artists, NO Japanese artists, NO acoustic/soft ballads, NO electronic dance.

2. "Alt Rock"
   - Alternative Rock, Grunge (Nirvana, Soundgarden, Alice in Chains), Indie Rock (Arctic Monkeys, The Strokes, Surf Curse, The Killers, Franz Ferdinand), Pop Punk / Emo (Paramore, My Chemical Romance, Blink-182, Fall Out Boy), Britpop (Oasis, Blur), Shoegaze / Dream Pop (Slowdive, Wallows, Beach Fossils).
   - STRICT EXCLUSIONS: NO Indonesian artists, NO Japanese artists, NO heavy metal/deathcore.

3. "Rock Indo"
   - All Rock, Metal, Punk, Hardcore, and Indie Rock by Indonesian artists/bands.
   - Examples: Dewa 19 (rock tracks like Cemburu, Pangeran Cinta), Slank, Jamrud, Boomerang, /rif, Pas Band, Burgerkill, Seringai, Koil, Voice of Baceprot, .Feast, Kelompok Penerbang Roket, The Adams, Morfem, Pee Wee Gaskins, For Revenge, Killing Me Inside, DeadSquad, Superman Is Dead, Endank Soekamti, Avhath, Navicula.
   - STRICT EXCLUSIONS: NO pop santai/galau, NO DJ remix.

4. "Indo Pop Galau & Santai"
   - Indonesian Pop, Ballads, Acoustic, Indie Folk, Sad/Romantic/Galau songs, and Chill R&B.
   - Examples: Sheila on 7, Peterpan / Noah, Tulus, Hindia, Nadin Amizah, Pamungkas, Fiersa Besari, Juicy Luicy, Mahalini, Kangen Band, ST12, Dewa 19 (slow love ballads like Roman Picisan, Pupus, Risalah Hati, Kangen), Payung Teduh, Fourtwnty, Feby Putri, Raissa Anggiani, Danilla.
   - STRICT EXCLUSIONS: NO upbeat energetic dance-pop, NO heavy rock, NO breakbeat/DJ remixes.

5. "Indo Pop Semangat & Upbeat"
   - Indonesian upbeat, cheerful, high-energy Pop, Hip-Hop, Hyperpop, Dance-Pop, and energetic party songs.
   - Examples: Naykilla, Tenxi, 6sentani, Project Pop, upbeat Indonesian rap/hip-hop (Ramengvrl, Saykoji, Fade2Black), happy Indonesian dance-pop, upbeat RAN, upbeat Maliq & D'Essentials.
   - STRICT EXCLUSIONS: NO sad galau songs, NO heavy rock, NO funkot/breakbeat.

6. "Breakbeat & Funkot Indo"
   - Indonesian Club Breakbeat, Funkot, DJ Lokal Remix, Jedag-Jedug TikTok, Sound Horeg, Angklung remix, DJ Desa, DJ Opus, DJ Nofin Asia, DJ Cantik, DJ Komang, Indonesian electronic remix culture.
   - STRICT EXCLUSIONS: Western EDM only without Indo remix style.

7. "Techno & Rave"
   - High-energy 4-on-the-floor electronic dance: Techno (Peak Time, Acid, Industrial), Hardstyle, Hardtekk, Jumpstyle, Frenchcore, Rawstyle, Happy Hardcore (e.g. S3RL - Bass Slut, DJ Paul Elstak), Trance, Eurodance (Cascada), Psytrance.
   - STRICT EXCLUSIONS: NO Indonesian breakbeat/funkot, NO Brazilian funk/phonk, NO scenecore.

8. "Scenecore & Hyperpop"
   - Scenecore, Krushclub, Hyperpop, Webcore/Nightcore electronic dance.
   - Examples: 6arelyhuman, boy fantasy, asteria, kets4eki, syris, Odetari, Lumi Athena, Rebzyyx, hoshie star, dante red, cade clair.
   - STRICT EXCLUSIONS: Classic techno/hardstyle, pure rock/metal.

9. "Funk & Brazilian Phonk"
   - Brazilian Baile Funk, Funk Carioca, Brazilian Phonk, Drift Phonk, Funk Mandelão.
   - Examples: Kordhell, Montagem, DJ Arana, MC Kevinho, MC Hariel, Phonk Killer, Pharmacist, Hensonn, Ghostface Playa, MC Gw.

10. "All Japanese Songs"
    - ANY track by Japanese artists or in the Japanese language, regardless of subgenre (J-Pop, J-Rock, Anime OST, Vocaloid, City Pop).
    - Examples: YOASOBI, RADWIMPS, ONE OK ROCK, Eve, LiSA, Ado, Kenshi Yonezu, King Gnu, Babymetal, Hatsune Miku, Official HIGE DANdism, Fujii Kaze, Vaundy, aimer, milet, Spyair, Flow, Ling Tosite Sigure.

11. "SKIP"
    - Any track that does NOT fit into any of the 10 playlists above (e.g., standard Western Pop like Taylor Swift/Ariana Grande/Ed Sheeran, Western Rap/Hip-Hop like Drake/Eminem/Travis Scott, K-Pop like BTS/Blackpink, Classical, Jazz, Country, Ambient Chill, Reggae).

OUTPUT FORMAT:
Return a JSON list of objects matching each song in the batch:
[
  {
    "index": 0,
    "playlist": "Hard Rock & Metal" // exactly one of the 10 playlist names or "SKIP"
  }
]
"""

WORKING_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash"
]

FALLBACK_KEYS = [k for k in [os.environ.get("GEMINI_FALLBACK_KEY"), os.environ.get("GEMINI_API_KEY")] if k]

TARGET_PLAYLISTS = [
    "Hard Rock & Metal",
    "Alt Rock",
    "Rock Indo",
    "Indo Pop Galau & Santai",
    "Indo Pop Semangat & Upbeat",
    "Breakbeat & Funkot Indo",
    "Techno & Rave",
    "Scenecore & Hyperpop",
    "Funk & Brazilian Phonk",
    "All Japanese Songs"
]

def classify_batch_with_fallback(batch: List[Any], primary_key: str) -> tuple[List[Dict[str, Any]], str]:
    candidate_keys = [primary_key] + [k for k in FALLBACK_KEYS if k != primary_key]
    
    batch_prompt_items = []
    for idx, track in enumerate(batch):
        batch_prompt_items.append({
            "index": idx,
            "artist": track.artist,
            "title": track.title,
            "album": track.album or ""
        })

    prompt_content = f"Assign the following songs to their target playlist:\n{json.dumps(batch_prompt_items, indent=2)}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": PLAYLIST_SYSTEM_PROMPT},
                    {"text": prompt_content}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    for key in candidate_keys:
        for model_name in WORKING_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            try:
                r = requests.post(url, json=payload, timeout=35)
                if r.status_code == 200:
                    data = r.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text)
                    return parsed, model_name
                elif r.status_code in [403, 429, 404]:
                    continue
            except Exception:
                continue
            
    raise RuntimeError("All Gemini keys and models failed.")

def run_playlist_pipeline():
    tracks = get_all_tracks()
    total = len(tracks)
    logger.info(f"Loaded {total} tracks for direct-to-playlist classification.")
    settings = get_settings()
    key = settings.gemini_api_key

    # Initialize YTMusic
    yt = YTMusicSyncService()
    is_yt_ready = yt.is_authenticated()
    playlist_ids = {}

    if is_yt_ready:
        logger.info("=== STEP 1: INITIALIZING 10 TARGET PLAYLISTS ON YOUTUBE MUSIC ===")
        for pl_name in TARGET_PLAYLISTS:
            try:
                pl_id = yt.create_or_get_playlist(pl_name, f"Curated {pl_name} by SoundSort AI")
                playlist_ids[pl_name] = pl_id
                logger.info(f"Ready: '{pl_name}' -> https://music.youtube.com/playlist?list={pl_id}")
            except Exception as e:
                logger.warning(f"Could not init playlist {pl_name}: {e}")
    else:
        logger.info("YouTube Music not authenticated yet - will classify and store locally in db.json first.")

    batch_size = 50
    playlist_assignments = {pl: [] for pl in TARGET_PLAYLISTS}
    playlist_assignments["SKIP"] = []

    logger.info("=== STEP 2: CLASSIFYING & STREAMING DIRECTLY TO PLAYLISTS PER BATCH ===")
    for i in range(0, total, batch_size):
        batch = tracks[i:i+batch_size]
        try:
            results, model_used = classify_batch_with_fallback(batch, key)
            batch_by_playlist = {pl: [] for pl in TARGET_PLAYLISTS}

            for item in results:
                idx = item.get("index")
                target_pl = item.get("playlist", "SKIP")
                if target_pl not in playlist_assignments:
                    target_pl = "SKIP"
                if idx is not None and 0 <= idx < len(batch):
                    t = batch[idx]
                    t.assigned_playlist = target_pl
                    t.main_genre = target_pl if target_pl != "SKIP" else (t.main_genre or "Other")
                    t.sub_genre = target_pl if target_pl != "SKIP" else (t.sub_genre or "General")
                    playlist_assignments[target_pl].append(t)
                    if target_pl in batch_by_playlist:
                        batch_by_playlist[target_pl].append(t)

            logger.info(f"[{model_used}] Batch {i+1}-{min(i+batch_size, total)} / {total} classified ({int(min(i+batch_size, total)/total*100)}%)")

            # Real-time commit to YouTube Music for this batch
            if is_yt_ready:
                for pl_name, t_list in batch_by_playlist.items():
                    pl_id = playlist_ids.get(pl_name)
                    if not pl_id or not t_list:
                        continue
                    vids = []
                    for tr in t_list:
                        vid = tr.matched_yt_id
                        if not vid:
                            m = yt.search_best_match(tr)
                            if m and m[0]:
                                vid = m[0]
                                tr.matched_yt_id = m[0]
                                tr.matched_yt_title = m[1]
                                tr.is_synced = True
                        if vid:
                            vids.append(vid)
                    if vids:
                        try:
                            yt.add_playlist_items(pl_id, vids)
                            logger.info(f"  -> Added {len(vids)} songs to '{pl_name}'")
                        except Exception as e:
                            logger.error(f"  -> Error syncing to {pl_name}: {e}")

            # Save progress immediately after every batch
            save_all_tracks(tracks)

        except Exception as e:
            logger.error(f"Error in batch {i}: {e}")
        time.sleep(1.2)

    save_all_tracks(tracks)

    logger.info("\n==========================================")
    logger.info("FINAL PLAYLIST TRACK COUNTS:")
    for pl_name, t_list in playlist_assignments.items():
        logger.info(f" - {pl_name}: {len(t_list)} songs")
    logger.info("==========================================\n")

    if playlist_ids:
        logger.info("ALL PLAYLIST LINKS:")
        for pl_name, pl_id in playlist_ids.items():
            logger.info(f" - {pl_name}: https://music.youtube.com/playlist?list={pl_id}")

if __name__ == "__main__":
    run_playlist_pipeline()
