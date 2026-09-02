import os
import json
import logging
import requests
from typing import List, Dict, Any, Optional
from backend.services.storage import TrackItem, get_settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT_SYSTEM = """
You are an expert musicologist and master music genre curator with encyclopedic knowledge of global music scenes, subgenres, and electronic dance music.
Your task is to accurately classify a batch of songs by their musical Main Genre, specific Sub-genre, Vibe, and Energy Level.

Main Genre Taxonomy:
1. "Metal / Hardcore" -> Nu-Metal, Heavy Metal, Thrash Metal, Death Metal, Metalcore, Deathcore, Post-Hardcore, Industrial Metal, Hardcore Punk, Grunge, Sludge.
2. "Rock / Alternative" -> Alternative Rock, Indie Rock, Britpop, Punk Rock, Pop Punk, Shoegaze, Dream Pop, Post-Punk, Art Rock, Math Rock, Midwest Emo.
3. "Electronic / Dance" -> Techno (Peak Time, Industrial, Melodic), Hardstyle, Rawstyle, Hardcore Techno, Frenchcore, Jumpstyle, Trance, Psytrance, Eurodance, Tech House, Deep House, Liquid DnB, Drum & Bass, Dubstep, EDM.
4. "Breakbeat" -> Breakbeat, Indonesian Breakbeat Remix, UK Breaks, Nu-Skool Breaks, Big Beat (characterized by syncopated broken breakbeats, NOT straight 4/4 kicks).
5. "Funk / Baile" -> Brazilian Funk, Baile Funk, Funk Carioca, Funkot, Future Funk, Classic Funk, G-Funk, Synth-Funk.
6. "Breakcore" -> Breakcore, Glitchcore, Jungle Breakcore, Speedcore, Amen break chops.
7. "Phonk / Wave" -> Drift Phonk, Brazilian Phonk, Memphis Phonk, Wave, Phonk House.
8. "Hip-Hop / Rap" -> Trap, Boombap, Cloud Rap, UK Drill, Horrorcore, Emo Rap.
9. "Pop" -> Synthpop, Dance-Pop, Indie Pop, Hyperpop, City Pop, K-Pop, J-Pop.
10. "R&B / Soul" -> Contemporary R&B, Neo-Soul, Alt R&B.
11. "Ambient / Chill" -> Ambient, Drone, Chillout, Downtempo.

Important Disambiguation Rules:
- S3RL, Stonebank, Hixxy, Darren Styles are "Electronic / Dance" (Happy Hardcore / UK Hardcore), NEVER Rock/Metal.
- Breakbeat is distinctly separated from straight Techno/Hardstyle.
- Acoustic or slow indie tracks (e.g. Oasis acoustic, Slowdive, Arctic Monkeys ballads) are "Rock / Alternative", NOT "Metal / Hardcore".
- Brazilian Funk / Baile Funk is "Funk / Baile", distinct from standard Electronic.
- Breakcore is characterized by chaotic amen break slicing and distortion.

Output schema (JSON array):
[
  {
    "index": 0,
    "main_genre": "Metal / Hardcore",
    "sub_genre": "Nu-Metal",
    "vibe": "Aggressive & Heavy",
    "energy": "High",
    "confidence": 0.98
  }
]
"""

FALLBACK_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.6-flash"
]

class AIClassifier:
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-3.5-flash-lite"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = model or "gemini-3.5-flash-lite"

    def classify_single_batch(self, batch: List[TrackItem], api_key: str, preferred_model: str) -> tuple[List[Dict[str, Any]], str]:
        """
        Classifies a single batch of tracks with automatic model fallback.
        Returns (classified_items_list, working_model_name)
        """
        candidate_models = [preferred_model] + [m for m in FALLBACK_MODELS if m != preferred_model]
        
        batch_prompt_items = []
        for idx, track in enumerate(batch):
            batch_prompt_items.append({
                "index": idx,
                "artist": track.artist,
                "title": track.title,
                "album": track.album or "",
                "source": track.source_platform
            })

        prompt_content = f"Classify the following songs:\n{json.dumps(batch_prompt_items, indent=2)}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": PROMPT_SYSTEM},
                        {"text": prompt_content}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        resp = None
        working_model = preferred_model
        last_err = ""

        for model_name in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                r = requests.post(url, json=payload, timeout=35)
                if r.status_code == 200:
                    resp = r
                    working_model = model_name
                    break
                else:
                    last_err = r.text
                    logger.warning(f"Model {model_name} returned status {r.status_code}: {r.text[:120]}. Falling back...")
                    continue
            except Exception as ex:
                last_err = str(ex)
                logger.warning(f"Request error with model {model_name}: {ex}. Falling back...")
                continue

        if not resp or resp.status_code != 200:
            raise Exception(f"Gemini API Error: {last_err or 'All models unavailable'}")

        try:
            res_json = resp.json()
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"]
            classified_list = json.loads(text_response)
            return classified_list, working_model
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            raise e

    def classify_tracks(self, tracks: List[TrackItem], batch_size: int = 100) -> List[TrackItem]:
        """
        Classifies all tracks synchronously in batches of 100.
        """
        settings = get_settings()
        api_key = self.api_key or settings.gemini_api_key
        preferred_model = self.model or settings.gemini_model or "gemini-3.5-flash-lite"

        if not api_key:
            raise ValueError("Gemini API Key is missing. Please set your Gemini API key in Settings.")

        results = list(tracks)
        for i in range(0, len(tracks), batch_size):
            batch = results[i:i + batch_size]
            classified_items, _ = self.classify_single_batch(batch, api_key, preferred_model)
            for item in classified_items:
                idx = item.get("index")
                if idx is not None and 0 <= idx < len(batch):
                    results[i + idx].main_genre = item.get("main_genre", "Electronic")
                    results[i + idx].sub_genre = item.get("sub_genre", "General")
                    results[i + idx].vibe = item.get("vibe", "")
                    results[i + idx].confidence = float(item.get("confidence", 0.9))

        return results
