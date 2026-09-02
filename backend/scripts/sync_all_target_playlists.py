import os
import time
import logging
from collections import defaultdict
from backend.services.storage import get_all_tracks, save_all_tracks
from backend.services.ytmusic_sync import YTMusicSyncService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sync_playlists")

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

OLD_PLAYLIST_NAMES = [
    "Headbang", "Rave & High Energy", "Rave & High Energy (Techno / Hardstyle)", 
    "Breakbeat", "Funk & Brazilian Funk", "Funk", "Breakcore",
    "SoundSort: Headbang", "SoundSort: Rave & High Energy", "SoundSort: Breakbeat",
    "SoundSort: Alt Rock", "SoundSort: Hard Rock & Metal", "SoundSort: Rock Indo"
]

def main():
    tracks = get_all_tracks()
    logger.info(f"Loaded {len(tracks)} tracks from db.json.")

    by_playlist = defaultdict(list)
    for t in tracks:
        pl = t.assigned_playlist or t.main_genre
        if pl in TARGET_PLAYLISTS:
            by_playlist[pl].append(t)

    yt = YTMusicSyncService()
    if not yt.is_authenticated():
        logger.error("YouTube Music is not authenticated. Please provide fresh headers in Settings or chat.")
        return

    # Step 1: Clean old deprecated playlists
    logger.info("=== STEP 1: CLEANING OLD PLAYLISTS ===")
    try:
        user_pls = yt._ytmusic.get_library_playlists(limit=150)
        for p in user_pls:
            title = p.get("title", "").strip()
            for old in OLD_PLAYLIST_NAMES:
                if title.lower() == old.lower():
                    logger.info(f"Deleting old playlist: '{title}' ({p['playlistId']})")
                    try:
                        yt._ytmusic.delete_playlist(p["playlistId"])
                    except Exception as e:
                        logger.warning(f"Could not delete {title}: {e}")
                    break
    except Exception as ex:
        logger.warning(f"Note on old playlists check: {ex}")

    # Step 2: Initialize / create 10 playlists immediately
    logger.info("=== STEP 2: INITIALIZING 10 TARGET PLAYLISTS ===")
    playlist_ids = {}
    for pl_name in TARGET_PLAYLISTS:
        t_count = len(by_playlist[pl_name])
        desc = f"Curated {pl_name} by SoundSort AI ({t_count} tracks)"
        try:
            pl_id = yt.create_or_get_playlist(pl_name, desc)
            playlist_ids[pl_name] = pl_id
            logger.info(f"Ready: '{pl_name}' -> https://music.youtube.com/playlist?list={pl_id}")
        except Exception as e:
            logger.error(f"Failed to create playlist '{pl_name}': {e}")

    # Step 3: Stream and commit tracks in real-time per batch (Batch size = 20)
    logger.info("=== STEP 3: STREAMING & COMMITTING TRACKS PER BATCH ===")
    batch_size = 20
    for pl_name, t_list in by_playlist.items():
        pl_id = playlist_ids.get(pl_name)
        if not pl_id or not t_list:
            continue

        logger.info(f"\n>> Syncing '{pl_name}' ({len(t_list)} songs) in batches of {batch_size}...")
        
        for i in range(0, len(t_list), batch_size):
            batch = t_list[i:i + batch_size]
            video_ids = []
            
            for tr in batch:
                vid = tr.matched_yt_id
                if not vid:
                    match = yt.search_best_match(tr)
                    if match and match[0]:
                        vid = match[0]
                        tr.matched_yt_id = match[0]
                        tr.matched_yt_title = match[1]
                        tr.is_synced = True
                if vid:
                    video_ids.append(vid)

            if video_ids:
                try:
                    yt.add_playlist_items(pl_id, video_ids)
                    logger.info(f"  [+] Added {len(video_ids)} tracks to '{pl_name}' ({i + len(batch)}/{len(t_list)})")
                except Exception as e:
                    logger.error(f"  [!] Error adding batch {i} to {pl_name}: {e}")

            # Save progress after every small batch so nothing is lost
            save_all_tracks(tracks)
            time.sleep(0.3)

    logger.info("\nALL TARGET PLAYLISTS FULLY SYNCED!")
    for pl_name in TARGET_PLAYLISTS:
        if pl_name in playlist_ids:
            logger.info(f" - {pl_name}: https://music.youtube.com/playlist?list={playlist_ids[pl_name]}")

if __name__ == "__main__":
    main()
