import os
import json
import asyncio
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.services.storage import (
    TrackItem, WebPlaylist, AppSettings, get_settings, save_settings,
    get_all_tracks, save_all_tracks, add_tracks, update_track,
    bulk_update_subgenre, delete_track, clear_all_tracks,
    get_all_playlists, save_all_playlists, get_playlist_by_id,
    create_playlist, update_playlist, delete_playlist,
    add_tracks_to_playlist, remove_track_from_playlist
)
from backend.services.importer import MusicImporter, clean_track_metadata
from backend.services.ai_classifier import AIClassifier
from backend.services.ytmusic_sync import YTMusicSyncService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soundsort")

app = FastAPI(title="SoundSort AI API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

importer = MusicImporter()
ai_classifier = AIClassifier()
yt_sync = YTMusicSyncService()

# Request Models
class ImportRequest(BaseModel):
    input_text: str

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    playlist_prefix: Optional[str] = None

class YTAuthRequest(BaseModel):
    headers_raw: str

class ClassifyRequest(BaseModel):
    track_ids: Optional[List[str]] = None
    only_uncategorized: bool = True

class MergeGenresRequest(BaseModel):
    old_subgenre: str
    new_subgenre: str
    new_main_genre: Optional[str] = None

class CreatePlaylistRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    track_ids: Optional[List[str]] = []

class UpdatePlaylistRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    track_ids: Optional[List[str]] = None

class AddTracksToPlaylistRequest(BaseModel):
    track_ids: List[str]

class AddGenreToPlaylistRequest(BaseModel):
    genre_name: str
    match_field: Optional[str] = "sub_genre"  # 'sub_genre' | 'main_genre' | 'assigned_playlist'

class CustomPlaylistRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    track_ids: List[str]

class SyncRequest(BaseModel):
    subgenres: List[str]
    playlist_prefix: Optional[str] = None


@app.get("/api/status")
def get_system_status():
    settings = get_settings()
    tracks = get_all_tracks()
    playlists = get_all_playlists()
    is_yt_connected = yt_sync.is_authenticated()
    
    total_tracks = len(tracks)
    classified_tracks = len([t for t in tracks if t.sub_genre and t.sub_genre != "General" and t.main_genre != "Uncategorized"])
    synced_tracks = len([t for t in tracks if t.is_synced])
    
    unique_subgenres = list(set([t.sub_genre for t in tracks if t.sub_genre]))

    return {
        "gemini_configured": bool(settings.gemini_api_key),
        "ytmusic_connected": is_yt_connected,
        "total_tracks": total_tracks,
        "total_playlists": len(playlists),
        "classified_tracks": classified_tracks,
        "synced_tracks": synced_tracks,
        "total_subgenres": len(unique_subgenres),
        "subgenres": sorted(unique_subgenres)
    }

@app.get("/api/settings")
def api_get_settings():
    settings = get_settings()
    masked_key = ""
    if settings.gemini_api_key:
        masked_key = settings.gemini_api_key[:6] + "..." + settings.gemini_api_key[-4:] if len(settings.gemini_api_key) > 10 else "******"
    
    return {
        "has_gemini_key": bool(settings.gemini_api_key),
        "masked_gemini_key": masked_key,
        "gemini_model": settings.gemini_model,
        "playlist_prefix": settings.playlist_prefix,
        "ytmusic_connected": yt_sync.is_authenticated()
    }

@app.post("/api/settings")
def api_save_settings(req: SettingsUpdateRequest):
    current = get_settings()
    if req.gemini_api_key is not None and req.gemini_api_key.strip():
        current.gemini_api_key = req.gemini_api_key.strip()
    if req.gemini_model is not None:
        current.gemini_model = req.gemini_model.strip()
    if req.playlist_prefix is not None:
        current.playlist_prefix = req.playlist_prefix
    
    save_settings(current)
    return {"success": True, "message": "Settings updated successfully"}

@app.post("/api/ytmusic/setup")
def api_setup_ytmusic(req: YTAuthRequest):
    result = yt_sync.setup_browser_headers(req.headers_raw)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to setup YT Music auth"))
    return result

@app.get("/api/tracks")
def api_get_tracks(main_genre: Optional[str] = None, sub_genre: Optional[str] = None, search: Optional[str] = None):
    tracks = get_all_tracks()
    if main_genre:
        tracks = [t for t in tracks if (t.main_genre or "").lower() == main_genre.lower()]
    if sub_genre:
        tracks = [t for t in tracks if (t.sub_genre or "").lower() == sub_genre.lower()]
    if search:
        s = search.lower()
        tracks = [t for t in tracks if s in t.title.lower() or s in t.artist.lower() or s in (t.sub_genre or "").lower() or s in (t.main_genre or "").lower()]
    return tracks

@app.post("/api/tracks/import")
def api_import_tracks(req: ImportRequest):
    if not req.input_text.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty")
    
    extracted = importer.parse_input(req.input_text)
    if not extracted:
        raise HTTPException(status_code=400, detail="No tracks could be found or extracted from the given input.")
    
    added = add_tracks(extracted)
    return {
        "success": True,
        "total_extracted": len(extracted),
        "newly_added": len(added),
        "tracks": added
    }

@app.post("/api/tracks/import/file")
async def api_import_file(file: UploadFile = File(...)):
    try:
        content_bytes = await file.read()
        try:
            content_str = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content_str = content_bytes.decode("latin-1")

        if file.filename.lower().endswith(".csv") or "," in content_str[:500] or ";" in content_str[:500]:
            extracted = importer.parse_csv(content_str)
        else:
            extracted = importer.parse_input(content_str)

        if not extracted:
            raise HTTPException(status_code=400, detail="Could not find or parse songs in the uploaded file.")

        added = add_tracks(extracted)
        return {
            "success": True,
            "filename": file.filename,
            "total_extracted": len(extracted),
            "newly_added": len(added),
            "tracks": added
        }
    except Exception as e:
        logger.error(f"Error importing file {file.filename}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/tracks/import/yt-likes")
def api_import_yt_likes(limit: Optional[int] = None):
    if not yt_sync.is_authenticated():
        raise HTTPException(status_code=400, detail="YouTube Music is not connected. Please connect in Settings.")
    
    try:
        liked_data = yt_sync._ytmusic.get_liked_songs(limit=limit)
        tracks_data = liked_data.get("tracks", [])
        
        extracted: List[TrackItem] = []
        for item in tracks_data:
            if not item or not item.get("title"):
                continue
            title = item.get("title", "")
            artists = ", ".join([a.get("name", "") for a in item.get("artists", []) if a.get("name")]) or "Unknown Artist"
            album = item.get("album", {}).get("name", "") if item.get("album") else ""
            thumbs = item.get("thumbnails", [])
            thumb = thumbs[-1].get("url") if thumbs else ""
            vid_id = item.get("videoId")
            dur = item.get("duration", "")
            
            c_title, c_artist = clean_track_metadata(title, artists)
            extracted.append(TrackItem(
                title=c_title,
                artist=c_artist,
                album=album,
                thumbnail=thumb,
                duration_str=dur,
                source_platform="youtube",
                source_url=f"https://music.youtube.com/watch?v={vid_id}" if vid_id else "",
                matched_yt_id=vid_id,
                matched_yt_title=f"{c_artist} - {c_title}"
            ))
            
        added = add_tracks(extracted)
        return {
            "success": True,
            "total_extracted": len(extracted),
            "newly_added": len(added),
            "tracks": added
        }
    except Exception as e:
        logger.error(f"Error fetching YT Music likes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tracks/classify")
def api_classify_tracks(req: ClassifyRequest):
    all_tracks = get_all_tracks()
    if not all_tracks:
        raise HTTPException(status_code=400, detail="No tracks in library to classify.")

    if req.track_ids:
        to_classify = [t for t in all_tracks if t.id in req.track_ids]
    elif req.only_uncategorized:
        to_classify = [t for t in all_tracks if (t.sub_genre == "General" or t.main_genre == "Uncategorized" or not t.sub_genre)]
    else:
        to_classify = all_tracks

    if not to_classify:
        return {"success": True, "message": "All tracks are already classified!", "classified_count": 0}

    try:
        updated_classified = ai_classifier.classify_tracks(to_classify, batch_size=15)
        track_map = {t.id: t for t in updated_classified}
        for i, t in enumerate(all_tracks):
            if t.id in track_map:
                all_tracks[i] = track_map[t.id]
        
        save_all_tracks(all_tracks)

        return {
            "success": True,
            "classified_count": len(updated_classified),
            "tracks": updated_classified
        }
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tracks/classify/stream")
async def api_classify_tracks_stream(req: ClassifyRequest):
    all_tracks = get_all_tracks()
    if not all_tracks:
        raise HTTPException(status_code=400, detail="No tracks in library to classify.")

    if req.track_ids:
        to_classify = [t for t in all_tracks if t.id in req.track_ids]
    elif req.only_uncategorized:
        to_classify = [t for t in all_tracks if (t.sub_genre == "General" or t.main_genre == "Uncategorized" or not t.sub_genre)]
    else:
        to_classify = all_tracks

    if not to_classify:
        async def empty_gen():
            yield f"data: {json.dumps({'type': 'complete', 'message': 'All tracks already classified', 'total': 0})}\n\n"
        return StreamingResponse(empty_gen(), media_type="text/event-stream")

    settings = get_settings()
    api_key = settings.gemini_api_key
    model = settings.gemini_model or "gemini-3.7-flash"

    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key is missing. Please set your key in Settings.")

    async def classification_generator():
        batch_size = 50
        total_count = len(to_classify)
        processed_count = 0
        track_lookup = {t.id: t for t in all_tracks}

        yield f"data: {json.dumps({'type': 'start', 'total': total_count, 'batch_size': batch_size})}\n\n"
        await asyncio.sleep(0.01)

        for i in range(0, total_count, batch_size):
            batch = to_classify[i:i + batch_size]
            try:
                loop = asyncio.get_event_loop()
                classified_items, working_model = await loop.run_in_executor(
                    None, ai_classifier.classify_single_batch, batch, api_key, model
                )

                batch_updates = []
                for item in classified_items:
                    idx = item.get("index")
                    if idx is not None and 0 <= idx < len(batch):
                        tr = batch[idx]
                        tr.main_genre = item.get("main_genre", "Electronic")
                        tr.sub_genre = item.get("sub_genre", "General")
                        tr.vibe = item.get("vibe", "")
                        tr.confidence = float(item.get("confidence", 0.9))
                        track_lookup[tr.id] = tr
                        batch_updates.append(tr.model_dump())

                processed_count += len(batch)
                percent = min(100, round((processed_count / total_count) * 100))

                save_all_tracks(list(track_lookup.values()))

                event_payload = {
                    "type": "progress",
                    "processed": processed_count,
                    "total": total_count,
                    "percent": percent,
                    "batch_size": len(batch),
                    "model_used": working_model,
                    "batch_tracks": batch_updates
                }
                yield f"data: {json.dumps(event_payload)}\n\n"
                await asyncio.sleep(0.02)

            except Exception as e:
                logger.error(f"Error classifying batch {i}: {e}")
                err_payload = {"type": "error", "message": str(e), "processed": processed_count, "total": total_count}
                yield f"data: {json.dumps(err_payload)}\n\n"
                break

        complete_payload = {"type": "complete", "total_classified": processed_count}
        yield f"data: {json.dumps(complete_payload)}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    return StreamingResponse(classification_generator(), media_type="text/event-stream", headers=headers)

@app.patch("/api/tracks/{track_id}")
def api_update_track(track_id: str, updates: Dict[str, Any]):
    updated = update_track(track_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Track not found")
    return updated

@app.delete("/api/tracks/{track_id}")
def api_delete_track(track_id: str):
    success = delete_track(track_id)
    if not success:
        raise HTTPException(status_code=404, detail="Track not found")
    return {"success": True}

@app.delete("/api/tracks")
def api_clear_tracks():
    clear_all_tracks()
    return {"success": True, "message": "All tracks deleted"}

@app.post("/api/genres/merge")
def api_merge_genres(req: MergeGenresRequest):
    bulk_update_subgenre(req.old_subgenre, req.new_subgenre, req.new_main_genre)
    return {"success": True, "message": f"Merged '{req.old_subgenre}' into '{req.new_subgenre}'"}

# -------------------------------------------------------------
# Web Playlists API (First-Class Playlist Management)
# -------------------------------------------------------------
@app.get("/api/playlists")
def api_get_playlists():
    playlists = get_all_playlists()
    all_tracks = get_all_tracks()
    track_map = {t.id: t for t in all_tracks}
    
    result = []
    for p in playlists:
        valid_tracks = [track_map[tid] for tid in p.track_ids if tid in track_map]
        p_dict = p.model_dump()
        p_dict["track_count"] = len(valid_tracks)
        p_dict["tracks_preview"] = [t.model_dump() for t in valid_tracks[:5]]
        result.append(p_dict)
    return result

@app.post("/api/playlists")
def api_create_playlist(req: CreatePlaylistRequest):
    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Playlist title cannot be empty")
    new_p = create_playlist(req.title, req.description or "", req.track_ids or [])
    return new_p

@app.get("/api/playlists/{playlist_id}")
def api_get_playlist_detail(playlist_id: str):
    p = get_playlist_by_id(playlist_id)
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    all_tracks = get_all_tracks()
    track_map = {t.id: t for t in all_tracks}
    valid_tracks = [track_map[tid] for tid in p.track_ids if tid in track_map]
    
    data = p.model_dump()
    data["tracks"] = [t.model_dump() for t in valid_tracks]
    data["track_count"] = len(valid_tracks)
    return data

@app.patch("/api/playlists/{playlist_id}")
def api_update_playlist(playlist_id: str, req: UpdatePlaylistRequest):
    updates = {}
    if req.title is not None:
        updates["title"] = req.title.strip()
    if req.description is not None:
        updates["description"] = req.description.strip()
    if req.track_ids is not None:
        updates["track_ids"] = list(dict.fromkeys(req.track_ids))
        
    p = update_playlist(playlist_id, updates)
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return p

@app.delete("/api/playlists/{playlist_id}")
def api_delete_playlist(playlist_id: str):
    success = delete_playlist(playlist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"success": True, "message": "Playlist deleted"}

@app.post("/api/playlists/{playlist_id}/tracks")
def api_add_tracks_to_playlist(playlist_id: str, req: AddTracksToPlaylistRequest):
    p = get_playlist_by_id(playlist_id)
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if not req.track_ids:
        raise HTTPException(status_code=400, detail="No track IDs provided")
    
    updated_p = add_tracks_to_playlist(playlist_id, req.track_ids)
    return {
        "success": True,
        "playlist": updated_p,
        "total_tracks": len(updated_p.track_ids)
    }

@app.delete("/api/playlists/{playlist_id}/tracks/{track_id}")
def api_remove_track_from_playlist(playlist_id: str, track_id: str):
    updated_p = remove_track_from_playlist(playlist_id, track_id)
    if not updated_p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {
        "success": True,
        "playlist": updated_p,
        "total_tracks": len(updated_p.track_ids)
    }

@app.post("/api/playlists/{playlist_id}/add-genre")
def api_add_genre_to_playlist(playlist_id: str, req: AddGenreToPlaylistRequest):
    p = get_playlist_by_id(playlist_id)
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    all_tracks = get_all_tracks()
    target_name = req.genre_name.strip().lower()
    
    matched_ids = []
    for t in all_tracks:
        if req.match_field == "main_genre" and (t.main_genre or "").strip().lower() == target_name:
            matched_ids.append(t.id)
        elif req.match_field == "assigned_playlist" and (t.assigned_playlist or "").strip().lower() == target_name:
            matched_ids.append(t.id)
        elif (t.sub_genre or "").strip().lower() == target_name or (t.main_genre or "").strip().lower() == target_name or (t.assigned_playlist or "").strip().lower() == target_name:
            matched_ids.append(t.id)
            
    if not matched_ids:
        raise HTTPException(status_code=400, detail=f"No tracks found matching genre '{req.genre_name}'")
        
    updated_p = add_tracks_to_playlist(playlist_id, matched_ids)
    return {
        "success": True,
        "added_count": len(matched_ids),
        "total_tracks": len(updated_p.track_ids),
        "playlist": updated_p
    }

@app.post("/api/playlists/auto-generate-from-genres")
def api_auto_generate_from_genres():
    all_tracks = get_all_tracks()
    if not all_tracks:
        raise HTTPException(status_code=400, detail="No tracks in library")
        
    genre_groups = {}
    for t in all_tracks:
        g = (t.assigned_playlist or t.sub_genre or t.main_genre or "").strip()
        if not g or g in ["General", "Uncategorized", "SKIP", "Other"]:
            continue
        if g not in genre_groups:
            genre_groups[g] = []
        genre_groups[g].append(t.id)
        
    existing_playlists = get_all_playlists()
    existing_titles = {p.title.lower(): p for p in existing_playlists}
    
    created_or_updated = []
    for genre, tids in genre_groups.items():
        if genre.lower() in existing_titles:
            p = existing_titles[genre.lower()]
            p = add_tracks_to_playlist(p.id, tids)
            created_or_updated.append(p)
        else:
            p = create_playlist(title=genre, description=f"Curated {genre} tracks from SoundSort", track_ids=tids)
            created_or_updated.append(p)
            
    return {
        "success": True,
        "message": f"Generated/updated {len(created_or_updated)} playlists from detected genres!",
        "count": len(created_or_updated)
    }

# -------------------------------------------------------------
# YouTube Music Exporting
# -------------------------------------------------------------
@app.post("/api/playlists/{playlist_id}/export-yt")
def api_export_playlist_to_yt(playlist_id: str):
    if not yt_sync.is_authenticated():
        raise HTTPException(status_code=400, detail="YouTube Music is not connected. Please connect in Settings.")

    p = get_playlist_by_id(playlist_id)
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    all_tracks = get_all_tracks()
    track_map = {t.id: t for t in all_tracks}
    playlist_tracks = [track_map[tid] for tid in p.track_ids if tid in track_map]
    
    if not playlist_tracks:
        raise HTTPException(status_code=400, detail="Playlist has no valid tracks to export.")

    try:
        # 1. Create or get playlist on YouTube Music
        yt_pl_id = yt_sync.create_or_get_playlist(p.title, p.description or f"Created with SoundSort AI ({len(playlist_tracks)} songs)")
        
        # 2. Match video IDs in batches
        video_ids = []
        batch_size = 25
        for i in range(0, len(playlist_tracks), batch_size):
            batch = playlist_tracks[i:i+batch_size]
            batch_vids = []
            for tr in batch:
                vid = tr.matched_yt_id
                if not vid:
                    match = yt_sync.search_best_match(tr)
                    if match and match[0]:
                        vid = match[0]
                        tr.matched_yt_id = match[0]
                        tr.matched_yt_title = match[1]
                        tr.is_synced = True
                if vid:
                    batch_vids.append(vid)
                    video_ids.append(vid)
            if batch_vids:
                yt_sync.add_playlist_items(yt_pl_id, batch_vids)

        # 3. Update playlist status
        yt_url = f"https://music.youtube.com/playlist?list={yt_pl_id}"
        update_playlist(playlist_id, {
            "yt_playlist_id": yt_pl_id,
            "yt_playlist_url": yt_url,
            "is_synced": True
        })
        save_all_tracks(all_tracks)

        return {
            "success": True,
            "playlist_id": yt_pl_id,
            "playlist_url": yt_url,
            "title": p.title,
            "added_count": len(video_ids),
            "total_tracks": len(playlist_tracks)
        }
    except Exception as e:
        logger.error(f"Error exporting playlist {p.title} to YouTube Music: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playlists/export-all-yt")
def api_export_all_playlists_to_yt():
    if not yt_sync.is_authenticated():
        raise HTTPException(status_code=400, detail="YouTube Music is not connected. Please connect in Settings.")

    playlists = get_all_playlists()
    if not playlists:
        raise HTTPException(status_code=400, detail="No playlists to export.")

    all_tracks = get_all_tracks()
    track_map = {t.id: t for t in all_tracks}
    results = []

    for p in playlists:
        p_tracks = [track_map[tid] for tid in p.track_ids if tid in track_map]
        if not p_tracks:
            continue
        try:
            yt_pl_id = yt_sync.create_or_get_playlist(p.title, p.description or f"SoundSort Playlist ({len(p_tracks)} songs)")
            video_ids = []
            for tr in p_tracks:
                vid = tr.matched_yt_id
                if not vid:
                    m = yt_sync.search_best_match(tr)
                    if m and m[0]:
                        vid = m[0]
                        tr.matched_yt_id = m[0]
                        tr.matched_yt_title = m[1]
                        tr.is_synced = True
                if vid:
                    video_ids.append(vid)
            if video_ids:
                yt_sync.add_playlist_items(yt_pl_id, video_ids)
            
            yt_url = f"https://music.youtube.com/playlist?list={yt_pl_id}"
            update_playlist(p.id, {
                "yt_playlist_id": yt_pl_id,
                "yt_playlist_url": yt_url,
                "is_synced": True
            })
            results.append({
                "title": p.title,
                "success": True,
                "playlist_url": yt_url,
                "tracks_synced": len(video_ids)
            })
        except Exception as e:
            logger.error(f"Failed to export {p.title}: {e}")
            results.append({
                "title": p.title,
                "success": False,
                "error": str(e)
            })

    save_all_tracks(all_tracks)
    return {
        "success": True,
        "results": results
    }

@app.post("/api/ytmusic/sync")
def api_sync_ytmusic(req: SyncRequest):
    if not yt_sync.is_authenticated():
        raise HTTPException(status_code=400, detail="YouTube Music is not connected. Please setup your auth in Settings.")

    if not req.subgenres:
        raise HTTPException(status_code=400, detail="Please select at least one subgenre to sync.")

    settings = get_settings()
    prefix = req.playlist_prefix or settings.playlist_prefix or "SoundSort: "

    all_tracks = get_all_tracks()
    sync_results = []

    for subgenre in req.subgenres:
        genre_tracks = [t for t in all_tracks if (t.sub_genre or "").strip().lower() == subgenre.strip().lower()]
        if not genre_tracks:
            continue

        try:
            report = yt_sync.sync_subgenre_playlist(subgenre, genre_tracks, prefix)
            sync_results.append(report)
        except Exception as e:
            logger.error(f"Failed syncing subgenre '{subgenre}': {e}")
            sync_results.append({
                "subgenre": subgenre,
                "error": str(e),
                "success": False
            })

    save_all_tracks(all_tracks)

    return {
        "success": True,
        "playlists": sync_results
    }

@app.post("/api/ytmusic/custom-playlist")
def api_create_custom_playlist(req: CustomPlaylistRequest):
    if not yt_sync.is_authenticated():
        raise HTTPException(status_code=400, detail="YouTube Music is not connected. Please connect in Settings first.")

    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Playlist title is required.")

    if not req.track_ids:
        raise HTTPException(status_code=400, detail="No tracks selected for playlist.")

    all_tracks = get_all_tracks()
    track_map = {t.id: t for t in all_tracks}
    selected_tracks = [track_map[tid] for tid in req.track_ids if tid in track_map]

    if not selected_tracks:
        raise HTTPException(status_code=400, detail="None of the selected tracks were found in your library.")

    try:
        playlist_id = yt_sync.create_or_get_playlist(req.title.strip(), req.description or "Created with SoundSort AI")
        video_ids = []
        for tr in selected_tracks:
            match = yt_sync.search_best_match(tr)
            if match and match[0]:
                video_ids.append(match[0])
                tr.matched_yt_id = match[0]
                tr.matched_yt_title = match[1]
                tr.is_synced = True

        if video_ids:
            yt_sync.add_playlist_items(playlist_id, video_ids)

        save_all_tracks(all_tracks)

        return {
            "success": True,
            "playlist_id": playlist_id,
            "playlist_url": f"https://music.youtube.com/playlist?list={playlist_id}",
            "added_count": len(video_ids),
            "total_selected": len(selected_tracks)
        }
    except Exception as e:
        logger.error(f"Failed to create custom playlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount Frontend static files
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
