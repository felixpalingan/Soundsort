// SoundSort AI — Modular Mega App Controller & Hi-Fi Synced Lyrics Engine

const API_BASE = '/api';

const state = {
  allTracks: [],
  tracks: [],
  playlists: [],
  selectedTrackIds: new Set(),
  activeModule: 'player', // 'player' | 'analyzer' | 'tagger' | 'downloader' | 'playlists'
  currentInspectingPlaylist: null,
  targetPlaylistForAdd: null,
  allMainGenres: [],
  allSubgenres: [],
  systemStatus: null,
  settings: null,
  viewMode: 'grid', // 'grid' | 'table'
  filters: {
    search: '',
    source: '',
    mainGenre: '',
    subGenre: ''
  },
  // Player & Synced Lyrics state
  currentCuedTrack: null,
  isVinylPlaying: false,
  syncedLyrics: [], // [{ time: seconds, text: string }]
  plainLyrics: '',
  currentTime: 0,
  duration: 228,
  activeLyricsIndex: -1,
  playbackTimer: null,
  pitchRpm: 33,
  volumePercent: 85
};

const DEFAULT_THUMB_SVG = 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpolygon points="10 8 16 12 10 16 10 8"/%3E%3C/svg%3E';

function getSafeThumb(url) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('"') || url.includes('<')) {
    return DEFAULT_THUMB_SVG;
  }
  return encodeURI(url.trim());
}

const DEMO_TRACKS_INPUT = `Tame Impala - Borderline
Arctic Monkeys - 505
Paramore - Misery Business
6arelyhuman - Hands Up!
Sheila On 7 - Dan
Kordhell - Murder In My Mind
S3RL - Bass Slut
YOASOBI - Racing Into The Night
.Feast - Peradaban
Slipknot - Psychosocial`;

// DOM Elements Registry
const elements = {
  // Navigation Tabs
  navTabPlayer: document.getElementById('navTabPlayer'),
  navTabAnalyzer: document.getElementById('navTabAnalyzer'),
  navTabTagger: document.getElementById('navTabTagger'),
  navTabDownloader: document.getElementById('navTabDownloader'),
  navTabPlaylists: document.getElementById('navTabPlaylists'),

  // Module Pages
  modulePlayer: document.getElementById('modulePlayer'),
  moduleAnalyzer: document.getElementById('moduleAnalyzer'),
  moduleTagger: document.getElementById('moduleTagger'),
  moduleDownloader: document.getElementById('moduleDownloader'),
  modulePlaylists: document.getElementById('modulePlaylists'),

  // Badges & Counters
  tabCountLibrary: document.getElementById('tabCountLibrary'),
  tabCountLocal: document.getElementById('tabCountLocal'),
  tabCountPlaylists: document.getElementById('tabCountPlaylists'),
  geminiStatusChip: document.getElementById('geminiStatusChip'),
  ytStatusChip: document.getElementById('ytStatusChip'),

  // Hi-Fi Player & Synced Lyrics Elements
  turntableDisc: document.getElementById('turntableDisc'),
  turntableTonearm: document.getElementById('turntableTonearm'),
  vinylCenterArt: document.getElementById('vinylCenterArt'),
  btnGrandPlayToggle: document.getElementById('btnGrandPlayToggle'),
  grandPlaySvg: document.getElementById('grandPlaySvg'),
  playerTimeCurrent: document.getElementById('playerTimeCurrent'),
  playerTimeTotal: document.getElementById('playerTimeTotal'),
  playerArcFill: document.getElementById('playerArcFill'),
  playerArcDot: document.getElementById('playerArcDot'),
  knobPitch: document.getElementById('knobPitch'),
  pitchValueLabel: document.getElementById('pitchValueLabel'),
  knobVolume: document.getElementById('knobVolume'),
  volumeValueLabel: document.getElementById('volumeValueLabel'),
  playerGenreTag: document.getElementById('playerGenreTag'),
  playerArtistName: document.getElementById('playerArtistName'),
  playerAlbumTitle: document.getElementById('playerAlbumTitle'),
  playerTrackTitle: document.getElementById('playerTrackTitle'),
  syncedLyricsContainer: document.getElementById('syncedLyricsContainer'),
  lyricsLinesWrapper: document.getElementById('lyricsLinesWrapper'),
  lyricsLoadingPlaceholder: document.getElementById('lyricsLoadingPlaceholder'),
  lyricsStatusBadge: document.getElementById('lyricsStatusBadge'),
  btnRefreshLyrics: document.getElementById('btnRefreshLyrics'),
  btnToggleLikeCurrent: document.getElementById('btnToggleLikeCurrent'),
  btnQuickAddToQueue: document.getElementById('btnQuickAddToQueue'),
  btnOpenQueueDrawer: document.getElementById('btnOpenQueueDrawer'),
  nativeAudioPlayer: document.getElementById('nativeAudioPlayer'),

  // Bottom Persistent Mini Player
  btnPlayerPlayToggle: document.getElementById('btnPlayerPlayToggle'),
  btnPlayerPrev: document.getElementById('btnPlayerPrev'),
  btnPlayerNext: document.getElementById('btnPlayerNext'),
  playIconSvg: document.getElementById('playIconSvg'),
  deckPlayerTitle: document.getElementById('deckPlayerTitle'),
  deckPlayerArtist: document.getElementById('deckPlayerArtist'),
  globalScrubberBar: document.getElementById('globalScrubberBar'),
  globalScrubberFill: document.getElementById('globalScrubberFill'),
  btnBottomJumpToPlayer: document.getElementById('btnBottomJumpToPlayer'),

  // Analyzer Module Elements
  importInput: document.getElementById('importInput'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  btnUploadCsv: document.getElementById('btnUploadCsv'),
  btnImport: document.getElementById('btnImport'),
  importSpinner: document.getElementById('importSpinner'),
  btnLoadSample: document.getElementById('btnLoadSample'),
  btnImportYtLikes: document.getElementById('btnImportYtLikes'),
  btnClearTracks: document.getElementById('btnClearTracks'),
  btnClassify: document.getElementById('btnClassify'),
  btnClassifyText: document.getElementById('btnClassifyText'),
  classifySpinner: document.getElementById('classifySpinner'),
  chkOnlyUncategorized: document.getElementById('chkOnlyUncategorized'),
  aiProgressWrapper: document.getElementById('aiProgressWrapper'),
  aiProgressLabel: document.getElementById('aiProgressLabel'),
  aiProgressPercent: document.getElementById('aiProgressPercent'),
  aiProgressBarFill: document.getElementById('aiProgressBarFill'),
  aiProgressSubtext: document.getElementById('aiProgressSubtext'),
  filterSearch: document.getElementById('filterSearch'),
  filterSource: document.getElementById('filterSource'),
  filterMainGenre: document.getElementById('filterMainGenre'),
  filterSubGenre: document.getElementById('filterSubGenre'),
  btnViewGrid: document.getElementById('btnViewGrid'),
  btnViewTable: document.getElementById('btnViewTable'),
  studioContent: document.getElementById('studioContent'),
  btnOpenMergeModal: document.getElementById('btnOpenMergeModal'),
  btnOpenCustomPlaylistModal: document.getElementById('btnOpenCustomPlaylistModal'),

  // Tagger Module Elements
  inputLocalScanPath: document.getElementById('inputLocalScanPath'),
  btnTriggerScanPath: document.getElementById('btnTriggerScanPath'),
  scanSpinner: document.getElementById('scanSpinner'),
  btnTagAllLocalTracks: document.getElementById('btnTagAllLocalTracks'),
  tagAllSpinner: document.getElementById('tagAllSpinner'),
  localUntaggedCount: document.getElementById('localUntaggedCount'),
  inputOrganizeDestPath: document.getElementById('inputOrganizeDestPath'),
  btnOrganizeLocalFiles: document.getElementById('btnOrganizeLocalFiles'),
  btnRefreshLocalList: document.getElementById('btnRefreshLocalList'),
  localTracksListTableContainer: document.getElementById('localTracksListTableContainer'),

  // Downloader Module Elements
  inputSingleDownloadUrl: document.getElementById('inputSingleDownloadUrl'),
  btnTriggerQuickDownload: document.getElementById('btnTriggerQuickDownload'),
  quickDownloadSpinner: document.getElementById('quickDownloadSpinner'),
  downloaderOnlineTracksContainer: document.getElementById('downloaderOnlineTracksContainer'),

  // Playlists Studio Elements
  playlistsGrid: document.getElementById('playlistsGrid'),
  btnOpenCreatePlaylistModal: document.getElementById('btnOpenCreatePlaylistModal'),
  btnAutoGeneratePlaylists: document.getElementById('btnAutoGeneratePlaylists'),
  btnExportAllPlaylists: document.getElementById('btnExportAllPlaylists'),

  // Selection Action Bar
  selectionActionBar: document.getElementById('selectionActionBar'),
  selectedCountBadge: document.getElementById('selectedCountBadge'),
  btnAddSelectedToPlaylist: document.getElementById('btnAddSelectedToPlaylist'),
  btnDownloadSelectedTracks: document.getElementById('btnDownloadSelectedTracks'),
  btnTagSelectedTracks: document.getElementById('btnTagSelectedTracks'),
  btnDeselectAllTracks: document.getElementById('btnDeselectAllTracks'),

  // Modals
  settingsModal: document.getElementById('settingsModal'),
  inputGeminiKey: document.getElementById('inputGeminiKey'),
  selectGeminiModel: document.getElementById('selectGeminiModel'),
  inputYtHeaders: document.getElementById('inputYtHeaders'),
  btnConnectYT: document.getElementById('btnConnectYT'),
  ytAuthIndicator: document.getElementById('ytAuthIndicator'),
  inputPlaylistPrefix: document.getElementById('inputPlaylistPrefix'),
  inputDownloadFolder: document.getElementById('inputDownloadFolder'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),

  scanLocalModal: document.getElementById('scanLocalModal'),
  modalInputScanPath: document.getElementById('modalInputScanPath'),
  btnConfirmScanLocal: document.getElementById('btnConfirmScanLocal'),

  createPlaylistModal: document.getElementById('createPlaylistModal'),
  inputNewPlaylistTitle: document.getElementById('inputNewPlaylistTitle'),
  inputNewPlaylistDesc: document.getElementById('inputNewPlaylistDesc'),
  selectNewPlaylistGenre: document.getElementById('selectNewPlaylistGenre'),
  btnConfirmCreatePlaylist: document.getElementById('btnConfirmCreatePlaylist'),

  addToPlaylistModal: document.getElementById('addToPlaylistModal'),
  addToPlaylistSubtext: document.getElementById('addToPlaylistSubtext'),
  selectTargetPlaylist: document.getElementById('selectTargetPlaylist'),
  inputQuickNewPlaylistTitle: document.getElementById('inputQuickNewPlaylistTitle'),
  btnConfirmAddToPlaylist: document.getElementById('btnConfirmAddToPlaylist'),

  addGenreToPlaylistModal: document.getElementById('addGenreToPlaylistModal'),
  addGenreToPlaylistDesc: document.getElementById('addGenreToPlaylistDesc'),
  selectGenreToDump: document.getElementById('selectGenreToDump'),
  btnConfirmAddGenreToPlaylist: document.getElementById('btnConfirmAddGenreToPlaylist'),

  playlistInspectorModal: document.getElementById('playlistInspectorModal'),
  inspectorPlaylistTitle: document.getElementById('inspectorPlaylistTitle'),
  inspectorPlaylistDesc: document.getElementById('inspectorPlaylistDesc'),
  inspectorTrackCount: document.getElementById('inspectorTrackCount'),
  inspectorSyncedBadge: document.getElementById('inspectorSyncedBadge'),
  inspectorSearch: document.getElementById('inspectorSearch'),
  inspectorTracksList: document.getElementById('inspectorTracksList'),
  btnInspectorDownloadAll: document.getElementById('btnInspectorDownloadAll'),
  btnInspectorAddGenre: document.getElementById('btnInspectorAddGenre'),
  btnInspectorExportYT: document.getElementById('btnInspectorExportYT'),
  inspectorExportSpinner: document.getElementById('inspectorExportSpinner'),
  inspectorYtLink: document.getElementById('inspectorYtLink'),

  mergeModal: document.getElementById('mergeModal'),
  selectMergeSource: document.getElementById('selectMergeSource'),
  inputMergeTarget: document.getElementById('inputMergeTarget'),
  existingSubgenresList: document.getElementById('existingSubgenresList'),
  btnConfirmMerge: document.getElementById('btnConfirmMerge'),

  customPlaylistModal: document.getElementById('customPlaylistModal'),
  inputCustomPlaylistTitle: document.getElementById('inputCustomPlaylistTitle'),
  selectCustomMainGenre: document.getElementById('selectCustomMainGenre'),
  selectCustomSubGenre: document.getElementById('selectCustomSubGenre'),
  inputCustomVibeQuery: document.getElementById('inputCustomVibeQuery'),
  customMatchedCount: document.getElementById('customMatchedCount'),
  customMatchedList: document.getElementById('customMatchedList'),
  btnCreateCustomPlaylist: document.getElementById('btnCreateCustomPlaylist'),
  customPlaylistSpinner: document.getElementById('customPlaylistSpinner'),

  queueDrawerModal: document.getElementById('queueDrawerModal'),
  queueTrackCount: document.getElementById('queueTrackCount'),
  queueTracksList: document.getElementById('queueTracksList'),

  toastContainer: document.getElementById('toastContainer')
};

// -------------------------------------------------------------
// App Initialization
// -------------------------------------------------------------
async function initApp() {
  setupEventListeners();
  await loadSettings();
  await refreshAll();
  
  // Set default vinyl track if available
  if (state.allTracks.length > 0) {
    cueTrackOnVinyl(state.allTracks[0].id);
  }
}

async function refreshAll() {
  await loadStatus();
  await loadTracks();
  await loadPlaylists();
}

// -------------------------------------------------------------
// Mega App 5-Module Navigation (Router)
// -------------------------------------------------------------
function switchModule(moduleName) {
  state.activeModule = moduleName;

  // Tabs
  if (elements.navTabPlayer) elements.navTabPlayer.classList.toggle('active', moduleName === 'player');
  if (elements.navTabAnalyzer) elements.navTabAnalyzer.classList.toggle('active', moduleName === 'analyzer');
  if (elements.navTabTagger) elements.navTabTagger.classList.toggle('active', moduleName === 'tagger');
  if (elements.navTabDownloader) elements.navTabDownloader.classList.toggle('active', moduleName === 'downloader');
  if (elements.navTabPlaylists) elements.navTabPlaylists.classList.toggle('active', moduleName === 'playlists');

  // Pages
  if (elements.modulePlayer) elements.modulePlayer.classList.toggle('active', moduleName === 'player');
  if (elements.moduleAnalyzer) elements.moduleAnalyzer.classList.toggle('active', moduleName === 'analyzer');
  if (elements.moduleTagger) elements.moduleTagger.classList.toggle('active', moduleName === 'tagger');
  if (elements.moduleDownloader) elements.moduleDownloader.classList.toggle('active', moduleName === 'downloader');
  if (elements.modulePlaylists) elements.modulePlaylists.classList.toggle('active', moduleName === 'playlists');

  if (moduleName === 'tagger') {
    renderLocalTracksTable();
  } else if (moduleName === 'downloader') {
    renderDownloaderOnlineTable();
  } else if (moduleName === 'playlists') {
    renderPlaylistsGrid();
  } else if (moduleName === 'analyzer') {
    renderStudioContent();
  }
}

// -------------------------------------------------------------
// Hi-Fi Vinyl Turntable & Synced Lyrics Engine
// -------------------------------------------------------------
function parseLrcLyrics(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  lines.forEach(line => {
    let match;
    const timestamps = [];
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      timestamps.push(min * 60 + sec + ms / 1000);
    }
    const cleanText = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
    if (cleanText) {
      timestamps.forEach(t => {
        result.push({ time: t, text: cleanText });
      });
    }
  });

  result.sort((a, b) => a.time - b.time);
  return result;
}

async function fetchAndRenderLyrics(title, artist) {
  if (elements.lyricsLoadingPlaceholder) elements.lyricsLoadingPlaceholder.classList.remove('hidden');
  if (elements.lyricsLinesWrapper) elements.lyricsLinesWrapper.innerHTML = '';
  if (elements.lyricsStatusBadge) elements.lyricsStatusBadge.textContent = '⏳ Fetching Synced Lyrics...';

  try {
    const res = await fetch(`${API_BASE}/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || '')}`);
    const data = await res.json();

    if (data.syncedLyrics) {
      state.syncedLyrics = parseLrcLyrics(data.syncedLyrics);
      state.plainLyrics = data.plainLyrics;
      if (elements.lyricsStatusBadge) elements.lyricsStatusBadge.textContent = '✨ Synced Lyrics Active';
      renderSyncedLyricsList();
    } else if (data.plainLyrics) {
      state.syncedLyrics = [];
      state.plainLyrics = data.plainLyrics;
      if (elements.lyricsStatusBadge) elements.lyricsStatusBadge.textContent = '📄 Plain Lyrics Mode';
      renderPlainLyricsList(data.plainLyrics);
    } else {
      state.syncedLyrics = [];
      if (elements.lyricsStatusBadge) elements.lyricsStatusBadge.textContent = '🚫 No Lyrics Found';
      if (elements.lyricsLinesWrapper) {
        elements.lyricsLinesWrapper.innerHTML = `<div class="lyrics-line" style="color: var(--sleeve-text-muted);">No lyrics found for "${escapeHtml(title)}"</div>`;
      }
    }
  } catch (err) {
    console.error('Lyrics fetch error:', err);
    if (elements.lyricsStatusBadge) elements.lyricsStatusBadge.textContent = '🚫 Lyrics Unavailable';
  } finally {
    if (elements.lyricsLoadingPlaceholder) elements.lyricsLoadingPlaceholder.classList.add('hidden');
  }
}

function renderSyncedLyricsList() {
  if (!elements.lyricsLinesWrapper) return;
  elements.lyricsLinesWrapper.innerHTML = state.syncedLyrics.map((item, idx) => `
    <div class="lyrics-line" id="lyricLine-${idx}" onclick="jumpToLyricTime(${item.time})">
      ${escapeHtml(item.text)}
    </div>
  `).join('');
}

function renderPlainLyricsList(plainText) {
  if (!elements.lyricsLinesWrapper) return;
  const lines = plainText.split('\n').filter(l => l.trim().length > 0);
  elements.lyricsLinesWrapper.innerHTML = lines.map(line => `
    <div class="lyrics-line">${escapeHtml(line)}</div>
  `).join('');
}

function jumpToLyricTime(timeSec) {
  state.currentTime = timeSec;
  updatePlaybackPosition();
}

function cueTrackOnVinyl(trackId) {
  const tr = state.allTracks.find(t => t.id === trackId);
  if (!tr) return;
  state.currentCuedTrack = tr;

  // Update Poster Titles (Grand Poster side)
  if (elements.playerArtistName) elements.playerArtistName.textContent = tr.artist.toUpperCase();
  if (elements.playerAlbumTitle) elements.playerAlbumTitle.textContent = (tr.album || 'SOUNDSORT MASTER').toUpperCase();
  if (elements.playerTrackTitle) elements.playerTrackTitle.textContent = tr.title.toUpperCase();
  if (elements.playerGenreTag) elements.playerGenreTag.textContent = `${tr.sub_genre || tr.main_genre || 'Hi-Fi Analog'} • 45 RPM`;

  // Update Bottom Mini Player
  if (elements.deckPlayerTitle) elements.deckPlayerTitle.textContent = tr.title;
  if (elements.deckPlayerArtist) elements.deckPlayerArtist.textContent = tr.artist;

  // Center Art
  if (elements.vinylCenterArt && tr.thumbnail) {
    elements.vinylCenterArt.style.backgroundImage = `url('${getSafeThumb(tr.thumbnail)}')`;
  }

  // Configure audio stream for both local files and online streams
  if (elements.nativeAudioPlayer) {
    elements.nativeAudioPlayer.src = `${API_BASE}/player/stream/${tr.id}`;
    elements.nativeAudioPlayer.volume = state.volumePercent / 100;
    elements.nativeAudioPlayer.load();
  }

  // Reset time and fetch lyrics
  state.currentTime = 0;
  state.duration = tr.duration_seconds || 228;
  updatePlaybackPosition();
  fetchAndRenderLyrics(tr.title, tr.artist);

  startVinylSpin();
}

function startVinylSpin() {
  state.isVinylPlaying = true;
  if (elements.turntableDisc) elements.turntableDisc.classList.add('spinning');
  if (elements.turntableTonearm) elements.turntableTonearm.classList.add('engaged');

  const pauseSvg = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
  if (elements.playIconSvg) elements.playIconSvg.innerHTML = pauseSvg;
  if (elements.grandPlaySvg) elements.grandPlaySvg.innerHTML = pauseSvg;

  if (elements.nativeAudioPlayer) {
    elements.nativeAudioPlayer.play().catch(e => {
      console.log('Audio autoplay info:', e);
      showToast('Click anywhere on the player to enable audio playback', 'info');
    });
  }

  // Start progress clock
  if (state.playbackTimer) clearInterval(state.playbackTimer);
  state.playbackTimer = setInterval(() => {
    if (elements.nativeAudioPlayer && !elements.nativeAudioPlayer.paused && elements.nativeAudioPlayer.duration) {
      state.currentTime = Math.floor(elements.nativeAudioPlayer.currentTime);
      state.duration = Math.floor(elements.nativeAudioPlayer.duration);
      updatePlaybackPosition();
    } else {
      if (state.currentTime < state.duration) {
        state.currentTime += 1;
        updatePlaybackPosition();
      } else {
        playNextTrack();
      }
    }
  }, 1000);
}

function stopVinylSpin() {
  state.isVinylPlaying = false;
  if (elements.turntableDisc) elements.turntableDisc.classList.remove('spinning');
  if (elements.turntableTonearm) elements.turntableTonearm.classList.remove('engaged');

  const playSvg = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
  if (elements.playIconSvg) elements.playIconSvg.innerHTML = playSvg;
  if (elements.grandPlaySvg) elements.grandPlaySvg.innerHTML = playSvg;

  if (elements.nativeAudioPlayer) {
    elements.nativeAudioPlayer.pause();
  }

  if (state.playbackTimer) clearInterval(state.playbackTimer);
}

function toggleVinylPlayback() {
  if (state.isVinylPlaying) {
    stopVinylSpin();
  } else {
    if (!state.currentCuedTrack && state.tracks.length > 0) {
      cueTrackOnVinyl(state.tracks[0].id);
    } else {
      startVinylSpin();
    }
  }
}

function playPrevTrack() {
  if (!state.tracks || state.tracks.length === 0) return;
  if (!state.currentCuedTrack) {
    cueTrackOnVinyl(state.tracks[0].id);
    return;
  }
  const currentIndex = state.tracks.findIndex(t => t.id === state.currentCuedTrack.id);
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : state.tracks.length - 1;
  cueTrackOnVinyl(state.tracks[prevIndex].id);
}

function playNextTrack() {
  if (!state.tracks || state.tracks.length === 0) return;
  if (!state.currentCuedTrack) {
    cueTrackOnVinyl(state.tracks[0].id);
    return;
  }
  const currentIndex = state.tracks.findIndex(t => t.id === state.currentCuedTrack.id);
  const nextIndex = currentIndex < state.tracks.length - 1 ? currentIndex + 1 : 0;
  cueTrackOnVinyl(state.tracks[nextIndex].id);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updatePlaybackPosition() {
  const cur = state.currentTime;
  const tot = state.duration || 228;
  const pct = Math.min(100, Math.max(0, (cur / tot) * 100));

  if (elements.playerTimeCurrent) elements.playerTimeCurrent.textContent = formatTime(cur);
  if (elements.playerTimeTotal) elements.playerTimeTotal.textContent = formatTime(tot);

  if (elements.playerArcFill) elements.playerArcFill.style.width = `${pct}%`;
  if (elements.playerArcDot) elements.playerArcDot.style.left = `${pct}%`;
  if (elements.globalScrubberFill) elements.globalScrubberFill.style.width = `${pct}%`;

  // Update Synced Lyrics Highlighting & Auto Scroll
  if (state.syncedLyrics.length > 0) {
    let activeIdx = -1;
    for (let i = 0; i < state.syncedLyrics.length; i++) {
      if (cur >= state.syncedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== state.activeLyricsIndex) {
      state.activeLyricsIndex = activeIdx;
      document.querySelectorAll('.lyrics-line').forEach(el => el.classList.remove('active'));

      if (activeIdx >= 0) {
        const activeEl = document.getElementById(`lyricLine-${activeIdx}`);
        if (activeEl) {
          activeEl.classList.add('active');
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Loaders & State Refresh
// -------------------------------------------------------------
async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) return;
    const data = await res.json();
    state.systemStatus = data;

    updateChip(elements.geminiStatusChip, data.gemini_configured, 'Gemini Ready', 'Gemini Off');
    updateChip(elements.ytStatusChip, data.ytmusic_connected, 'YT Music Connected', 'YT Offline');

    elements.tabCountLibrary.textContent = data.total_tracks;
    elements.tabCountPlaylists.textContent = data.total_playlists || 0;
    elements.tabCountLocal.textContent = data.local_tracks || 0;

    const untaggedCount = Math.max(0, (data.local_tracks || 0) - (data.tagged_tracks || 0));
    if (elements.localUntaggedCount) elements.localUntaggedCount.textContent = untaggedCount;
  } catch (err) {
    console.error('Status load error:', err);
  }
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) return;
    const data = await res.json();
    state.settings = data;

    if (data.gemini_model && elements.selectGeminiModel) {
      elements.selectGeminiModel.value = data.gemini_model;
    }
    if (data.playlist_prefix && elements.inputPlaylistPrefix) {
      elements.inputPlaylistPrefix.value = data.playlist_prefix;
    }
    if (data.download_directory && elements.inputDownloadFolder) {
      elements.inputDownloadFolder.value = data.download_directory;
    }
    if (data.masked_gemini_key && elements.inputGeminiKey) {
      elements.inputGeminiKey.placeholder = `Current: ${data.masked_gemini_key}`;
    }
    updateYTAuthBadge(data.ytmusic_connected);
  } catch (err) {
    console.error('Settings load error:', err);
  }
}

async function loadTracks() {
  try {
    const res = await fetch(`${API_BASE}/tracks`);
    if (!res.ok) throw new Error('Failed loading tracks');
    const allTracks = await res.json();
    state.allTracks = allTracks;

    state.allMainGenres = Array.from(new Set(allTracks.map(t => t.main_genre).filter(Boolean))).sort();
    state.allSubgenres = Array.from(new Set(allTracks.map(t => t.sub_genre).filter(Boolean))).sort();

    updateGenreFilterDropdowns();
    applyFiltersAndRender();
    renderLocalTracksTable();
    renderDownloaderOnlineTable();
  } catch (err) {
    console.error('Error loading tracks:', err);
  }
}

async function loadPlaylists() {
  try {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) return;
    const playlists = await res.json();
    state.playlists = playlists;
    if (elements.tabCountPlaylists) elements.tabCountPlaylists.textContent = playlists.length;
    renderPlaylistsGrid();
  } catch (err) {
    console.error('Playlists load error:', err);
  }
}

function updateGenreFilterDropdowns() {
  const mainSelect = elements.filterMainGenre;
  if (!mainSelect) return;
  const currentMain = state.filters.mainGenre || '';

  mainSelect.innerHTML = '<option value="">All Main Genres</option>';
  state.allMainGenres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    mainSelect.appendChild(opt);
  });
  mainSelect.value = currentMain;

  const subSelect = elements.filterSubGenre;
  if (!subSelect) return;
  const currentSub = state.filters.subGenre || '';

  let availableSubs = state.allTracks;
  if (currentMain) {
    availableSubs = availableSubs.filter(t => (t.main_genre || '').toLowerCase() === currentMain.toLowerCase());
  }
  const filteredSubgenres = Array.from(new Set(availableSubs.map(t => t.sub_genre).filter(Boolean))).sort();

  subSelect.innerHTML = '<option value="">All Sub-genres</option>';
  filteredSubgenres.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subSelect.appendChild(opt);
  });
  subSelect.value = currentSub;
}

// -------------------------------------------------------------
// Track Filtering & Rendering (Analyzer Module)
// -------------------------------------------------------------
function applyFiltersAndRender() {
  let filtered = [...state.allTracks];
  const q = state.filters.search.trim().toLowerCase();
  const src = state.filters.source;
  const mg = state.filters.mainGenre.trim().toLowerCase();
  const sg = state.filters.subGenre.trim().toLowerCase();

  if (q) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.sub_genre && t.sub_genre.toLowerCase().includes(q)) ||
      (t.main_genre && t.main_genre.toLowerCase().includes(q)) ||
      (t.vibe && t.vibe.toLowerCase().includes(q))
    );
  }

  if (src === 'local') filtered = filtered.filter(t => t.is_local);
  else if (src === 'online') filtered = filtered.filter(t => !t.is_local);

  if (mg) filtered = filtered.filter(t => (t.main_genre || '').toLowerCase() === mg);
  if (sg) filtered = filtered.filter(t => (t.sub_genre || '').toLowerCase() === sg);

  state.tracks = filtered;
  renderStudioContent();
}

function renderStudioContent() {
  const container = elements.studioContent;
  if (!container) return;

  if (!state.tracks || state.tracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 30px; text-align: center;">
        <div style="font-size: 2rem;">🎵</div>
        <h3>No matching tracks found</h3>
        <p>Try clearing filters or importing tracks above.</p>
      </div>
    `;
    return;
  }

  if (state.viewMode === 'grid') {
    renderGroupedGridView(container);
  } else {
    renderTableView(container);
  }
}

function renderGroupedGridView(container) {
  const groups = {};
  state.tracks.forEach(t => {
    const gName = t.sub_genre || 'General';
    if (!groups[gName]) groups[gName] = [];
    groups[gName].push(t);
  });

  const sortedGenreNames = Object.keys(groups).sort((a, b) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b);
  });

  container.innerHTML = '';
  const gridContainer = document.createElement('div');
  gridContainer.className = 'subgenre-cards-grid';

  sortedGenreNames.forEach(genreName => {
    const list = groups[genreName];
    const groupCard = document.createElement('div');
    groupCard.className = 'subgenre-group-card';

    groupCard.innerHTML = `
      <div class="group-card-header">
        <div class="group-title-left">
          <h3 class="group-name">${escapeHtml(genreName)}</h3>
          <span class="badge badge-subgenre">${list.length} tracks</span>
        </div>
        <div class="group-actions">
          <button class="btn-sleeve-btn btn-sm" onclick="quickCreatePlaylistForGenre('${escapeHtml(genreName)}')">
            ➕ Playlist
          </button>
        </div>
      </div>
      <div class="group-card-tracks">
        ${list.map((t, idx) => `
          <div class="track-row-compact" onclick="cueTrackOnVinyl('${t.id}'); switchModule('player');" style="cursor: pointer;" title="Click to play on Vinyl Deck">
            <input type="checkbox" class="track-select-checkbox" data-track-id="${t.id}" ${state.selectedTrackIds.has(t.id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleTrackSelection('${t.id}')">
            <span style="font-family: var(--font-brand); font-weight: 800; font-size: 0.75rem; color: var(--sleeve-text-muted); width: 18px;">${String(idx + 1).padStart(2, '0')}</span>
            <img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover">
            <div class="track-info-mini">
              <span class="track-title-mini">${escapeHtml(t.title)}</span>
              <span class="track-artist-mini">${escapeHtml(t.artist)}</span>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;" onclick="event.stopPropagation();">
              ${t.is_local 
                ? `<span class="badge badge-local">💾 Local</span>
                   <button class="btn-tag-track" onclick="handleTagSingleTrack('${t.id}')">🏷️ Tag</button>` 
                : `<button class="btn-download-track" onclick="handleDownloadSingleTrack('${t.id}', this)">⬇️</button>`
              }
              <button class="btn-quick-add-pl" onclick="openAddToPlaylistModal('${t.id}')">+ PL</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    gridContainer.appendChild(groupCard);
  });

  container.appendChild(gridContainer);
}

function renderTableView(container) {
  container.innerHTML = `
    <div class="table-wrapper">
      <table class="tracks-table">
        <thead>
          <tr>
            <th width="40"><input type="checkbox" onchange="toggleSelectAllTable(this)"></th>
            <th width="30">#</th>
            <th width="50">Cover</th>
            <th>Title & Artist</th>
            <th>Source</th>
            <th>Main Genre</th>
            <th>Sub-genre</th>
            <th>Vibe / Mood</th>
            <th width="160">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.tracks.map((t, idx) => `
            <tr onclick="cueTrackOnVinyl('${t.id}'); switchModule('player');" style="cursor: pointer;">
              <td onclick="event.stopPropagation();"><input type="checkbox" class="track-select-checkbox" data-track-id="${t.id}" ${state.selectedTrackIds.has(t.id) ? 'checked' : ''} onchange="toggleTrackSelection('${t.id}')"></td>
              <td style="font-family: var(--font-brand); font-weight: 800; font-size: 0.75rem; color: var(--sleeve-text-muted);">${String(idx + 1).padStart(2, '0')}</td>
              <td><img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover"></td>
              <td>
                <div class="table-track-title" style="font-weight: 700;">${escapeHtml(t.title)}</div>
                <div class="table-track-artist" style="color: var(--sleeve-text-muted); font-size: 0.75rem;">${escapeHtml(t.artist)}</div>
              </td>
              <td>
                ${t.is_local ? `<span class="badge badge-local">💾 Local</span>` : `<span class="badge badge-online">🌐 Online</span>`}
              </td>
              <td><span class="badge badge-subgenre">${escapeHtml(t.main_genre || 'Other')}</span></td>
              <td><span class="badge badge-subgenre" style="background: #ffffff; border: 1px solid var(--sleeve-border);">${escapeHtml(t.sub_genre || 'General')}</span></td>
              <td><span style="font-size: 0.75rem; color: var(--sleeve-text-secondary);">${escapeHtml(t.vibe || '-')}</span></td>
              <td onclick="event.stopPropagation();">
                <div style="display: flex; gap: 6px; align-items: center;">
                  ${t.is_local 
                    ? `<button class="btn-tag-track" onclick="handleTagSingleTrack('${t.id}')">🏷️ Tag</button>` 
                    : `<button class="btn-download-track" onclick="handleDownloadSingleTrack('${t.id}', this)">⬇️ DL</button>`}
                  <button class="btn-quick-add-pl" onclick="openAddToPlaylistModal('${t.id}')">➕ PL</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleSelectAllTable(cb) {
  if (cb.checked) {
    state.tracks.forEach(t => state.selectedTrackIds.add(t.id));
  } else {
    state.selectedTrackIds.clear();
  }
  updateSelectionBar();
  updateCheckboxesState();
}

// -------------------------------------------------------------
// Local Audio Scanner & Tagging (Module 3)
// -------------------------------------------------------------
function setScanPath(path) {
  if (elements.inputLocalScanPath) elements.inputLocalScanPath.value = path;
  if (elements.modalInputScanPath) elements.modalInputScanPath.value = path;
}

async function handleScanLocalFolder(path) {
  if (!path || !path.trim()) {
    showToast('Please enter a valid directory path', 'error');
    return;
  }

  if (elements.scanSpinner) elements.scanSpinner.classList.remove('hidden');
  if (elements.btnTriggerScanPath) elements.btnTriggerScanPath.disabled = true;

  try {
    showToast(`Scanning folder ${path}...`, 'info');
    const res = await fetch(`${API_BASE}/local/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory_path: path.trim() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Scan failed');

    closeModal(elements.scanLocalModal);
    showToast(data.message, 'success');
    await refreshAll();
    switchModule('tagger');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (elements.scanSpinner) elements.scanSpinner.classList.add('hidden');
    if (elements.btnTriggerScanPath) elements.btnTriggerScanPath.disabled = false;
  }
}

async function handleTagSingleTrack(trackId) {
  try {
    showToast('Writing ID3 tags to local audio file...', 'info');
    const res = await fetch(`${API_BASE}/local/tag-track/${trackId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed tagging track');

    showToast(data.message, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTagAllLocalTracks() {
  if (elements.tagAllSpinner) elements.tagAllSpinner.classList.remove('hidden');
  if (elements.btnTagAllLocalTracks) elements.btnTagAllLocalTracks.disabled = true;

  try {
    showToast('Writing ID3 tags to all local files...', 'info');
    const res = await fetch(`${API_BASE}/local/tag-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed tagging files');

    showToast(data.message, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (elements.tagAllSpinner) elements.tagAllSpinner.classList.add('hidden');
    if (elements.btnTagAllLocalTracks) elements.btnTagAllLocalTracks.disabled = false;
  }
}

async function handleOrganizeLocalFiles() {
  const targetDir = elements.inputOrganizeDestPath.value.trim();
  if (!targetDir) {
    showToast('Please specify a target directory', 'error');
    return;
  }

  if (!confirm(`Organize local files into genre subfolders at: ${targetDir}?`)) return;

  try {
    showToast('Organizing audio files into genre subfolders...', 'info');
    const res = await fetch(`${API_BASE}/local/organize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_directory: targetDir, copy_instead_of_move: true })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed organizing files');

    showToast(`Organized ${data.moved_count} files into genre folders!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLocalTracksTable() {
  const container = elements.localTracksListTableContainer;
  if (!container) return;
  const localTracks = state.allTracks.filter(t => t.is_local);

  if (localTracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px; text-align: center;">
        <div style="font-size: 1.8rem;">💾</div>
        <h3>No local audio files scanned yet</h3>
        <p>Use the scanner above to scan your computer's music folder.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="tracks-table">
        <thead>
          <tr>
            <th width="40"><input type="checkbox" onchange="toggleSelectAllTable(this)"></th>
            <th>Title & Artist</th>
            <th>AI Sub-genre</th>
            <th>File Path</th>
            <th>Tag Status</th>
            <th width="120">Action</th>
          </tr>
        </thead>
        <tbody>
          ${localTracks.map(t => `
            <tr>
              <td><input type="checkbox" class="track-select-checkbox" data-track-id="${t.id}" ${state.selectedTrackIds.has(t.id) ? 'checked' : ''} onchange="toggleTrackSelection('${t.id}')"></td>
              <td>
                <div style="font-weight: 700;">${escapeHtml(t.title)}</div>
                <div style="color: var(--sleeve-text-muted); font-size: 0.75rem;">${escapeHtml(t.artist)}</div>
              </td>
              <td><span class="badge badge-subgenre">${escapeHtml(t.sub_genre || t.main_genre || 'General')}</span></td>
              <td><span style="font-family: monospace; font-size: 0.75rem; color: var(--sleeve-text-muted);">${escapeHtml(t.file_path || '-')}</span></td>
              <td>${t.is_tagged ? `<span class="badge badge-tagged">🏷️ Tagged</span>` : `<span class="badge badge-draft">Untagged</span>`}</td>
              <td><button class="btn-tag-track" onclick="handleTagSingleTrack('${t.id}')">🏷️ Tag File</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// -------------------------------------------------------------
// Downloader Module (Module 4)
// -------------------------------------------------------------
async function handleDownloadSingleTrack(trackId, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = `⏳ DL...`;
  }
  showToast('Downloading audio stream & embedding tags...', 'info');

  try {
    const res = await fetch(`${API_BASE}/downloader/download-track/${trackId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Download failed');

    showToast(`Downloaded "${data.title}" to ${data.filename} with full ID3 tags!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = `⬇️ DL`;
    }
  }
}

async function handleDownloadSelectedTracks() {
  const tids = Array.from(state.selectedTrackIds);
  if (tids.length === 0) {
    showToast('No tracks selected', 'error');
    return;
  }

  showToast(`Downloading ${tids.length} selected tracks...`, 'info');
  try {
    const res = await fetch(`${API_BASE}/downloader/download-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_ids: tids })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Batch download failed');

    showToast(`Successfully downloaded ${data.downloaded_count} songs with ID3 tags!`, 'success');
    deselectAllTracks();
    await refreshAll();
    switchModule('tagger');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleQuickDownloadFromInput() {
  const raw = elements.inputSingleDownloadUrl.value.trim();
  if (!raw) {
    showToast('Please enter a song name or YouTube link', 'error');
    return;
  }

  elements.quickDownloadSpinner.classList.remove('hidden');
  elements.btnTriggerQuickDownload.disabled = true;

  try {
    showToast('Searching & downloading audio stream with ID3 tags...', 'info');
    // First import text
    const impRes = await fetch(`${API_BASE}/tracks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_text: raw })
    });
    const impData = await impRes.json();
    await loadTracks();

    if (state.allTracks.length > 0) {
      const target = state.allTracks[state.allTracks.length - 1];
      const dlRes = await fetch(`${API_BASE}/downloader/download-track/${target.id}`, { method: 'POST' });
      const dlData = await dlRes.json();
      showToast(`Downloaded "${dlData.title}" successfully with ID3 tags!`, 'success');
      elements.inputSingleDownloadUrl.value = '';
      await refreshAll();
      cueTrackOnVinyl(target.id);
      switchModule('player');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.quickDownloadSpinner.classList.add('hidden');
    elements.btnTriggerQuickDownload.disabled = false;
  }
}

function renderDownloaderOnlineTable() {
  const container = elements.downloaderOnlineTracksContainer;
  if (!container) return;
  const onlineTracks = state.allTracks.filter(t => !t.is_local);

  if (onlineTracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px; text-align: center;">
        <div style="font-size: 1.8rem;">🌐</div>
        <h3>No online tracks in library</h3>
        <p>Import songs using the AI Analyzer module or use the Quick Download bar above.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="tracks-table">
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title & Artist</th>
            <th>Genre / Vibe</th>
            <th width="120">Action</th>
          </tr>
        </thead>
        <tbody>
          ${onlineTracks.map(t => `
            <tr>
              <td><img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover"></td>
              <td>
                <div style="font-weight: 700;">${escapeHtml(t.title)}</div>
                <div style="color: var(--sleeve-text-muted); font-size: 0.75rem;">${escapeHtml(t.artist)}</div>
              </td>
              <td><span class="badge badge-subgenre">${escapeHtml(t.sub_genre || t.main_genre || 'Other')}</span></td>
              <td><button class="btn-download-track" onclick="handleDownloadSingleTrack('${t.id}', this)">⬇️ Download MP3</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// -------------------------------------------------------------
// Playlists Studio (Module 5)
// -------------------------------------------------------------
function renderPlaylistsGrid() {
  const grid = elements.playlistsGrid;
  if (!grid) return;

  if (!state.playlists || state.playlists.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
        <div style="font-size: 2rem;">📑</div>
        <h3>No Web Playlists Created Yet</h3>
        <p>Create a custom playlist or auto-generate playlists from your AI genres!</p>
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn-analog-dark" onclick="openCreatePlaylistModal()">➕ Create Playlist</button>
          <button class="btn-sleeve-btn" onclick="autoGeneratePlaylists()">⚡ Auto-From Genres</button>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.playlists.map(p => {
    const trackCount = p.track_count !== undefined ? p.track_count : (p.track_ids ? p.track_ids.length : 0);
    const syncBadgeHtml = p.is_synced && p.yt_playlist_url
      ? `<a href="${p.yt_playlist_url}" target="_blank" class="badge-synced" style="text-decoration: none; color: #0284c7; font-weight: 700; font-size: 0.75rem;">YT Music ↗</a>`
      : `<span class="badge badge-draft">Draft</span>`;

    return `
      <div class="playlist-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <h3 class="playlist-card-title">${escapeHtml(p.title)}</h3>
            ${syncBadgeHtml}
          </div>
          <p class="playlist-card-desc">${escapeHtml(p.description || 'SoundSort Curated')}</p>
          <div style="margin-bottom: 10px;"><span class="badge badge-subgenre">🎵 ${trackCount} tracks</span></div>
        </div>
        <div class="playlist-card-actions">
          <button class="btn-sleeve-btn btn-sm" onclick="openPlaylistInspector('${p.id}')">👁 View (${trackCount})</button>
          <button class="btn-sleeve-btn btn-sm" onclick="openAddGenreModal('${p.id}')">➕ Add Genre</button>
          <button class="btn-download-track" onclick="handleDownloadPlaylist('${p.id}')">⬇️ DL MP3s</button>
          <button class="btn-analog-red btn-sm" onclick="exportPlaylistToYT('${p.id}', this)">🚀 Export YT</button>
          <button class="btn-sleeve-danger" style="padding: 4px 8px;" onclick="deleteWebPlaylist('${p.id}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

async function handleDownloadPlaylist(playlistId) {
  showToast('Downloading entire playlist to local folder with tags...', 'info');
  try {
    const res = await fetch(`${API_BASE}/downloader/download-playlist/${playlistId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Playlist download failed');

    showToast(`Downloaded ${data.downloaded_count} songs into "${data.playlist_title}" folder!`, 'success');
    await refreshAll();
    switchModule('tagger');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportPlaylistToYT(playlistId, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = 'Exporting...';
  }
  showToast('🚀 Syncing playlist to YouTube Music...', 'info');

  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/export-yt`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Export failed');

    showToast(`🎉 Playlist "${data.title}" exported to YouTube Music! (${data.added_count} songs)`, 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = '🚀 Export YT';
    }
  }
}

async function exportAllPlaylistsToYT() {
  if (!confirm('Export all web playlists to YouTube Music now?')) return;
  const btn = elements.btnExportAllPlaylists;
  btn.disabled = true;
  btn.textContent = 'Exporting All...';

  try {
    showToast('Exporting all playlists to YouTube Music...', 'info');
    const res = await fetch(`${API_BASE}/playlists/export-all-yt`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Bulk export failed');

    showToast('All playlists exported to YouTube Music!', 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg><span>Export All to YT</span>`;
  }
}

function openCreatePlaylistModal() {
  elements.inputNewPlaylistTitle.value = '';
  elements.inputNewPlaylistDesc.value = '';
  const select = elements.selectNewPlaylistGenre;
  select.innerHTML = '<option value="">-- Start Empty --</option>';

  const genres = Array.from(new Set(state.allTracks.map(t => t.assigned_playlist || t.sub_genre || t.main_genre).filter(Boolean))).sort();
  genres.forEach(g => {
    if (g && g !== 'SKIP' && g !== 'General' && g !== 'Uncategorized') {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `All songs from: ${g}`;
      select.appendChild(opt);
    }
  });

  openModal(elements.createPlaylistModal);
}

async function handleConfirmCreatePlaylist() {
  const title = elements.inputNewPlaylistTitle.value.trim();
  const desc = elements.inputNewPlaylistDesc.value.trim();
  const prefillGenre = elements.selectNewPlaylistGenre.value;

  if (!title) {
    showToast('Please enter a playlist title', 'error');
    return;
  }

  let trackIds = [];
  if (prefillGenre) {
    const targetName = prefillGenre.toLowerCase();
    trackIds = state.allTracks
      .filter(t => (t.assigned_playlist || '').toLowerCase() === targetName || (t.sub_genre || '').toLowerCase() === targetName || (t.main_genre || '').toLowerCase() === targetName)
      .map(t => t.id);
  }

  try {
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, track_ids: trackIds })
    });
    if (!res.ok) throw new Error('Failed to create playlist');

    closeModal(elements.createPlaylistModal);
    showToast(`Created playlist "${title}" with ${trackIds.length} songs!`, 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteWebPlaylist(playlistId) {
  if (!confirm('Are you sure you want to delete this playlist?')) return;
  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete playlist');
    showToast('Playlist deleted', 'info');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function autoGeneratePlaylists() {
  try {
    showToast('⚡ Generating playlists from all genres...', 'info');
    const res = await fetch(`${API_BASE}/playlists/auto-generate-from-genres`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to auto-generate playlists');
    const data = await res.json();
    showToast(data.message, 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddGenreModal(playlistId) {
  state.targetPlaylistForAdd = playlistId;
  const p = state.playlists.find(x => x.id === playlistId);
  if (elements.addGenreToPlaylistDesc) {
    elements.addGenreToPlaylistDesc.textContent = `Select a genre from your library to add into "${p ? p.title : 'Playlist'}":`;
  }

  const select = elements.selectGenreToDump;
  select.innerHTML = '';
  const genres = Array.from(new Set(state.allTracks.map(t => t.assigned_playlist || t.sub_genre || t.main_genre).filter(Boolean))).sort();
  genres.forEach(g => {
    if (g && g !== 'SKIP' && g !== 'General' && g !== 'Uncategorized') {
      const count = state.allTracks.filter(t => (t.assigned_playlist || '').toLowerCase() === g.toLowerCase() || (t.sub_genre || '').toLowerCase() === g.toLowerCase() || (t.main_genre || '').toLowerCase() === g.toLowerCase()).length;
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `${g} (${count} tracks)`;
      select.appendChild(opt);
    }
  });

  openModal(elements.addGenreToPlaylistModal);
}

async function handleConfirmAddGenreToPlaylist() {
  const playlistId = state.targetPlaylistForAdd;
  const genreName = elements.selectGenreToDump.value;
  if (!playlistId || !genreName) return;

  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/add-genre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre_name: genreName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed adding genre');

    closeModal(elements.addGenreToPlaylistModal);
    showToast(`Added ${data.added_count} tracks from "${genreName}"! Total: ${data.total_tracks}`, 'success');
    await loadPlaylists();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openPlaylistInspector(playlistId) {
  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}`);
    if (!res.ok) throw new Error('Could not load playlist detail');
    const p = await res.json();
    state.currentInspectingPlaylist = p;

    elements.inspectorPlaylistTitle.textContent = p.title;
    elements.inspectorPlaylistDesc.textContent = p.description || 'No description';
    elements.inspectorTrackCount.textContent = `${p.track_count} tracks`;

    if (p.is_synced && p.yt_playlist_url) {
      elements.inspectorSyncedBadge.classList.remove('hidden');
      elements.inspectorYtLink.classList.remove('hidden');
      elements.inspectorYtLink.href = p.yt_playlist_url;
    } else {
      elements.inspectorSyncedBadge.classList.add('hidden');
      elements.inspectorYtLink.classList.add('hidden');
    }

    elements.inspectorSearch.value = '';
    renderInspectorTracksList(p.tracks || []);
    openModal(elements.playlistInspectorModal);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderInspectorTracksList(tracksList) {
  const container = elements.inspectorTracksList;
  const q = elements.inspectorSearch.value.trim().toLowerCase();

  let filtered = tracksList;
  if (q) {
    filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--sleeve-text-muted);">No songs found in playlist</div>`;
    return;
  }

  container.innerHTML = filtered.map((t, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--sleeve-border);">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-family: var(--font-brand); font-weight: 800; font-size: 0.75rem; color: var(--sleeve-text-muted); width: 18px;">${idx + 1}</span>
        <img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover">
        <div>
          <div style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(t.title)}</div>
          <div style="font-size: 0.75rem; color: var(--sleeve-text-muted);">${escapeHtml(t.artist)} &bull; <span style="color: var(--accent-red); font-weight: 700;">${escapeHtml(t.sub_genre || t.main_genre || '')}</span></div>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button class="btn-sleeve-ghost" onclick="cueTrackOnVinyl('${t.id}'); closeModal(elements.playlistInspectorModal); switchModule('player');" title="Play on Vinyl">🎵 Play</button>
        <button class="btn-sleeve-danger" style="padding: 4px 8px;" onclick="removeTrackFromCurrentPlaylist('${t.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function removeTrackFromCurrentPlaylist(trackId) {
  if (!state.currentInspectingPlaylist) return;
  const pid = state.currentInspectingPlaylist.id;
  try {
    const res = await fetch(`${API_BASE}/playlists/${pid}/tracks/${trackId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove track');
    await openPlaylistInspector(pid);
    await loadPlaylists();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Multi-Selection & Floating Bar Actions
// -------------------------------------------------------------
function toggleTrackSelection(trackId) {
  if (state.selectedTrackIds.has(trackId)) {
    state.selectedTrackIds.delete(trackId);
  } else {
    state.selectedTrackIds.add(trackId);
  }
  updateSelectionBar();
  updateCheckboxesState();
}

function deselectAllTracks() {
  state.selectedTrackIds.clear();
  updateSelectionBar();
  updateCheckboxesState();
}

function updateSelectionBar() {
  const bar = elements.selectionActionBar;
  const count = state.selectedTrackIds.size;
  if (elements.selectedCountBadge) elements.selectedCountBadge.textContent = count;
  if (count > 0) {
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

function updateCheckboxesState() {
  document.querySelectorAll('.track-select-checkbox').forEach(cb => {
    const tid = cb.getAttribute('data-track-id');
    cb.checked = state.selectedTrackIds.has(tid);
  });
}

function openQueueDrawerModal() {
  const container = elements.queueTracksList;
  if (!container) return;

  const queue = state.allTracks || [];
  if (elements.queueTrackCount) elements.queueTrackCount.textContent = `${queue.length} tracks`;

  if (queue.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--sleeve-text-muted);">No tracks in queue. Ingest tracks in the AI Analyzer first!</div>`;
  } else {
    container.innerHTML = queue.map((t, idx) => {
      const isCurrent = state.currentCuedTrack && state.currentCuedTrack.id === t.id;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: ${isCurrent ? '#ffffff' : 'transparent'}; border-radius: var(--radius-sm); border: 1px solid ${isCurrent ? 'var(--accent-red)' : 'var(--sleeve-border)'}; cursor: pointer;" onclick="cueTrackOnVinyl('${t.id}'); closeModal(elements.queueDrawerModal);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-family: var(--font-brand); font-weight: 800; font-size: 0.8rem; color: ${isCurrent ? 'var(--accent-red)' : 'var(--sleeve-text-muted)'}; width: 22px;">${isCurrent ? '▶' : String(idx + 1).padStart(2, '0')}</span>
            <img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover">
            <div>
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--sleeve-text);">${escapeHtml(t.title)}</div>
              <div style="font-size: 0.75rem; color: var(--sleeve-text-muted);">${escapeHtml(t.artist)}</div>
            </div>
          </div>
          <div>
            <span class="badge badge-subgenre">${escapeHtml(t.sub_genre || t.main_genre || 'General')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  openModal(elements.queueDrawerModal);
}

function openAddToPlaylistModal(specificTrackId = null) {
  const tids = specificTrackId ? [specificTrackId] : Array.from(state.selectedTrackIds);
  if (tids.length === 0) {
    showToast('No tracks selected', 'error');
    return;
  }

  elements.addToPlaylistSubtext.textContent = `Select which playlist to add ${tids.length} track(s) to:`;
  elements.inputQuickNewPlaylistTitle.value = '';

  const select = elements.selectTargetPlaylist;
  select.innerHTML = '';
  if (state.playlists.length === 0) {
    select.innerHTML = '<option value="">-- No playlists yet (type name below) --</option>';
  } else {
    state.playlists.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.track_count || (p.track_ids ? p.track_ids.length : 0)} tracks)`;
      select.appendChild(opt);
    });
  }

  state._pendingAddTrackIds = tids;
  openModal(elements.addToPlaylistModal);
}

async function handleConfirmAddToPlaylist() {
  const tids = state._pendingAddTrackIds || [];
  if (tids.length === 0) return;

  const quickTitle = elements.inputQuickNewPlaylistTitle.value.trim();
  let targetPlaylistId = elements.selectTargetPlaylist.value;

  try {
    if (quickTitle) {
      const res = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTitle, track_ids: tids })
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      showToast(`Created playlist "${quickTitle}" with ${tids.length} songs!`, 'success');
    } else if (targetPlaylistId) {
      const res = await fetch(`${API_BASE}/playlists/${targetPlaylistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_ids: tids })
      });
      if (!res.ok) throw new Error('Failed to add tracks');
      showToast(`Added ${tids.length} songs to playlist!`, 'success');
    }

    deselectAllTracks();
    closeModal(elements.addToPlaylistModal);
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTagSelectedTracks() {
  const tids = Array.from(state.selectedTrackIds);
  if (tids.length === 0) return;

  try {
    showToast(`Writing tags to ${tids.length} local files...`, 'info');
    const res = await fetch(`${API_BASE}/local/tag-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_ids: tids })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed tagging');

    showToast(data.message, 'success');
    deselectAllTracks();
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickCreatePlaylistForGenre(genreName) {
  const matchingIds = state.allTracks
    .filter(t => (t.assigned_playlist || '').toLowerCase() === genreName.toLowerCase() || (t.sub_genre || '').toLowerCase() === genreName.toLowerCase() || (t.main_genre || '').toLowerCase() === genreName.toLowerCase())
    .map(t => t.id);

  elements.inputNewPlaylistTitle.value = genreName;
  elements.inputNewPlaylistDesc.value = `Curated ${genreName} collection (${matchingIds.length} tracks)`;
  elements.selectNewPlaylistGenre.value = genreName;
  openModal(elements.createPlaylistModal);
}

// -------------------------------------------------------------
// Importers & AI Classification (Module 2)
// -------------------------------------------------------------
async function handleImportText() {
  const text = elements.importInput.value.trim();
  if (!text) {
    showToast('Please paste track names or links first', 'error');
    return;
  }

  elements.btnImport.disabled = true;
  elements.importSpinner.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/tracks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_text: text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Import failed');

    elements.importInput.value = '';
    showToast(`Successfully extracted ${data.total_extracted} tracks (${data.newly_added} new)!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnImport.disabled = false;
    elements.importSpinner.classList.add('hidden');
  }
}

async function handleFileUpload(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);

  elements.btnImport.disabled = true;
  elements.importSpinner.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/tracks/import/file`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'File import failed');

    showToast(`Uploaded ${file.name}: ${data.newly_added} songs imported!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnImport.disabled = false;
    elements.importSpinner.classList.add('hidden');
  }
}

async function handleImportYtLikes() {
  if (!state.settings?.ytmusic_connected) {
    showToast('Please connect your YouTube Music account in Settings first', 'error');
    openModal(elements.settingsModal);
    return;
  }

  showToast('Fetching Liked Songs from YouTube Music...', 'info');
  try {
    const res = await fetch(`${API_BASE}/tracks/import/yt-likes`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed fetching likes');

    showToast(`Imported ${data.total_extracted} liked songs (${data.newly_added} new)!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleClassifyTracks() {
  if (!state.settings?.has_gemini_key && !state.systemStatus?.gemini_configured) {
    showToast('Please configure your Gemini API Key in Settings first', 'error');
    openModal(elements.settingsModal);
    return;
  }

  const onlyUncategorized = elements.chkOnlyUncategorized.checked;
  elements.btnClassify.disabled = true;
  elements.classifySpinner.classList.remove('hidden');
  elements.aiProgressWrapper.classList.remove('hidden');
  elements.aiProgressPercent.textContent = '0%';
  elements.aiProgressBarFill.style.transform = 'scaleX(0)';
  elements.aiProgressLabel.textContent = '✨ Connecting to Gemini AI...';

  try {
    const res = await fetch(`${API_BASE}/tracks/classify/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ only_uncategorized: onlyUncategorized })
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.detail || 'Classification failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.substring(6));
            if (event.type === 'start') {
              elements.aiProgressLabel.textContent = `Analyzing ${event.total} tracks in batches...`;
            } else if (event.type === 'progress') {
              elements.aiProgressPercent.textContent = `${event.percent}%`;
              elements.aiProgressBarFill.style.transform = `scaleX(${event.percent / 100})`;
              elements.aiProgressSubtext.textContent = `${event.processed} / ${event.total} tracks analyzed [${event.model_used}]`;
            } else if (event.type === 'complete') {
              elements.aiProgressLabel.textContent = '✨ Classification Complete!';
              elements.aiProgressBarFill.style.transform = 'scaleX(1)';
              elements.aiProgressPercent.textContent = '100%';
              showToast('Classification completed successfully!', 'success');
            }
          } catch (e) {
            console.error('SSE JSON parse error:', e);
          }
        }
      }
    }

    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnClassify.disabled = false;
    elements.classifySpinner.classList.add('hidden');
    setTimeout(() => elements.aiProgressWrapper.classList.add('hidden'), 4000);
  }
}

// -------------------------------------------------------------
// Modals Handlers: Merge & Custom Playlist
// -------------------------------------------------------------
function openMergeModal() {
  const select = elements.selectMergeSource;
  const datalist = elements.existingSubgenresList;
  if (!select) return;

  select.innerHTML = '';
  if (datalist) datalist.innerHTML = '';

  const subs = state.allSubgenres.filter(s => s && s !== 'General' && s !== 'Uncategorized');
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);

    if (datalist) {
      const dOpt = document.createElement('option');
      dOpt.value = s;
      datalist.appendChild(dOpt);
    }
  });

  if (elements.inputMergeTarget) elements.inputMergeTarget.value = '';
  openModal(elements.mergeModal);
}

async function handleConfirmMerge() {
  const source = elements.selectMergeSource.value;
  const target = elements.inputMergeTarget.value.trim();

  if (!source || !target) {
    showToast('Please select source and target sub-genres', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/genres/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_subgenre: source, new_subgenre: target })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Merge failed');

    closeModal(elements.mergeModal);
    showToast(`Merged "${source}" into "${target}"!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openCustomPlaylistModal() {
  if (elements.inputCustomPlaylistTitle) elements.inputCustomPlaylistTitle.value = '';
  if (elements.inputCustomVibeQuery) elements.inputCustomVibeQuery.value = '';

  if (elements.selectCustomMainGenre) {
    elements.selectCustomMainGenre.innerHTML = '<option value="">All Main Genres</option>';
    state.allMainGenres.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      elements.selectCustomMainGenre.appendChild(opt);
    });
  }

  if (elements.selectCustomSubGenre) {
    elements.selectCustomSubGenre.innerHTML = '<option value="">All Sub-genres</option>';
    state.allSubgenres.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      elements.selectCustomSubGenre.appendChild(opt);
    });
  }

  updateCustomPlaylistPreview();
  openModal(elements.customPlaylistModal);
}

function updateCustomPlaylistPreview() {
  const mg = elements.selectCustomMainGenre ? elements.selectCustomMainGenre.value.toLowerCase() : '';
  const sg = elements.selectCustomSubGenre ? elements.selectCustomSubGenre.value.toLowerCase() : '';
  const vibe = elements.inputCustomVibeQuery ? elements.inputCustomVibeQuery.value.trim().toLowerCase() : '';

  let matched = [...state.allTracks];
  if (mg) matched = matched.filter(t => (t.main_genre || '').toLowerCase() === mg);
  if (sg) matched = matched.filter(t => (t.sub_genre || '').toLowerCase() === sg);
  if (vibe) matched = matched.filter(t => (t.vibe || '').toLowerCase().includes(vibe) || (t.sub_genre || '').toLowerCase().includes(vibe));

  state._matchedCustomTracks = matched;

  if (elements.customMatchedCount) elements.customMatchedCount.textContent = matched.length;
  if (elements.customMatchedList) {
    elements.customMatchedList.innerHTML = matched.slice(0, 40).map(t => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--sleeve-border); font-size: 0.8rem;">
        <div><strong>${escapeHtml(t.artist)}</strong> - ${escapeHtml(t.title)}</div>
        <span class="badge badge-subgenre">${escapeHtml(t.sub_genre || t.main_genre || '')}</span>
      </div>
    `).join('');
  }
}

async function handleCreateCustomPlaylist() {
  const title = elements.inputCustomPlaylistTitle.value.trim();
  const matched = state._matchedCustomTracks || [];

  if (!title) {
    showToast('Please enter a playlist title', 'error');
    return;
  }

  if (matched.length === 0) {
    showToast('No tracks matched criteria', 'error');
    return;
  }

  try {
    const trackIds = matched.map(t => t.id);
    const res = await fetch(`${API_BASE}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        description: `Custom curated playlist (${trackIds.length} tracks)`,
        track_ids: trackIds
      })
    });
    if (!res.ok) throw new Error('Failed to create playlist');

    closeModal(elements.customPlaylistModal);
    showToast(`Created playlist "${title}" with ${trackIds.length} tracks!`, 'success');
    await loadPlaylists();
    await loadStatus();
    switchModule('playlists');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Settings & Auth Modal
// -------------------------------------------------------------
async function handleSaveSettings() {
  const geminiKey = elements.inputGeminiKey.value.trim();
  const geminiModel = elements.selectGeminiModel.value;
  const prefix = elements.inputPlaylistPrefix.value.trim();
  const dlFolder = elements.inputDownloadFolder.value.trim();

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gemini_api_key: geminiKey || undefined,
        gemini_model: geminiModel,
        playlist_prefix: prefix,
        download_directory: dlFolder || undefined
      })
    });
    if (!res.ok) throw new Error('Failed saving settings');

    closeModal(elements.settingsModal);
    showToast('Settings saved successfully!', 'success');
    await loadSettings();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleConnectYT() {
  const rawHeaders = elements.inputYtHeaders.value.trim();
  if (!rawHeaders) {
    showToast('Please paste your YouTube Music headers or cookie', 'error');
    return;
  }

  elements.btnConnectYT.disabled = true;
  elements.btnConnectYT.textContent = 'Connecting...';

  try {
    const res = await fetch(`${API_BASE}/ytmusic/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers_raw: rawHeaders })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Connection failed');

    showToast('Successfully connected to YouTube Music!', 'success');
    elements.inputYtHeaders.value = '';
    await loadSettings();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnConnectYT.disabled = false;
    elements.btnConnectYT.textContent = 'Connect YouTube Music';
  }
}

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  // Mega App 5-Module Navigation
  if (elements.navTabPlayer) elements.navTabPlayer.addEventListener('click', () => switchModule('player'));
  if (elements.navTabAnalyzer) elements.navTabAnalyzer.addEventListener('click', () => switchModule('analyzer'));
  if (elements.navTabTagger) elements.navTabTagger.addEventListener('click', () => switchModule('tagger'));
  if (elements.navTabDownloader) elements.navTabDownloader.addEventListener('click', () => switchModule('downloader'));
  if (elements.navTabPlaylists) elements.navTabPlaylists.addEventListener('click', () => switchModule('playlists'));

  // Player & Synced Lyrics Controls
  if (elements.btnGrandPlayToggle) elements.btnGrandPlayToggle.addEventListener('click', toggleVinylPlayback);
  if (elements.btnPlayerPlayToggle) elements.btnPlayerPlayToggle.addEventListener('click', toggleVinylPlayback);
  if (elements.btnPlayerPrev) elements.btnPlayerPrev.addEventListener('click', playPrevTrack);
  if (elements.btnPlayerNext) elements.btnPlayerNext.addEventListener('click', playNextTrack);
  if (elements.btnBottomJumpToPlayer) elements.btnBottomJumpToPlayer.addEventListener('click', () => switchModule('player'));
  if (elements.btnRefreshLyrics) {
    elements.btnRefreshLyrics.addEventListener('click', () => {
      if (state.currentCuedTrack) fetchAndRenderLyrics(state.currentCuedTrack.title, state.currentCuedTrack.artist);
    });
  }

  // Poster Top Action Buttons
  if (elements.btnToggleLikeCurrent) {
    elements.btnToggleLikeCurrent.addEventListener('click', () => {
      if (!state.currentCuedTrack) {
        showToast('No track is currently playing', 'error');
        return;
      }
      state.currentCuedTrack._isLiked = !state.currentCuedTrack._isLiked;
      const isLiked = state.currentCuedTrack._isLiked;
      elements.btnToggleLikeCurrent.style.color = isLiked ? 'var(--accent-red)' : 'var(--sleeve-text)';
      showToast(isLiked ? `Added "${state.currentCuedTrack.title}" to Favorites ❤️` : `Removed from Favorites`, 'info');
    });
  }

  if (elements.btnQuickAddToQueue) {
    elements.btnQuickAddToQueue.addEventListener('click', () => {
      if (!state.currentCuedTrack) {
        showToast('No track is currently playing', 'error');
        return;
      }
      openAddToPlaylistModal(state.currentCuedTrack.id);
    });
  }

  if (elements.btnOpenQueueDrawer) {
    elements.btnOpenQueueDrawer.addEventListener('click', () => {
      openQueueDrawerModal();
    });
  }

  // Pitch Knob interaction (Rotates and toggles RPM)
  if (elements.knobPitch) {
    elements.knobPitch.addEventListener('click', () => {
      if (state.pitchRpm === 33) state.pitchRpm = 45;
      else if (state.pitchRpm === 45) state.pitchRpm = 78;
      else state.pitchRpm = 33;

      const deg = state.pitchRpm === 33 ? 0 : (state.pitchRpm === 45 ? 45 : 90);
      elements.knobPitch.style.transform = `rotate(${deg}deg)`;
      if (elements.pitchValueLabel) elements.pitchValueLabel.textContent = `${state.pitchRpm} RPM`;
      showToast(`Pitch speed set to ${state.pitchRpm} RPM`, 'info');
    });
  }

  // Volume Knob interaction
  if (elements.knobVolume) {
    elements.knobVolume.addEventListener('click', () => {
      state.volumePercent = state.volumePercent >= 100 ? 25 : state.volumePercent + 25;
      const deg = ((state.volumePercent / 100) * 270) - 135;
      elements.knobVolume.style.transform = `rotate(${deg}deg)`;
      if (elements.volumeValueLabel) elements.volumeValueLabel.textContent = `${state.volumePercent}%`;
      if (elements.nativeAudioPlayer) elements.nativeAudioPlayer.volume = state.volumePercent / 100;
      showToast(`Master Volume: ${state.volumePercent}%`, 'info');
    });
  }

  // Circular Arc Time Scrubber Seek
  const arcTrackLine = document.querySelector('.arc-track-line');
  if (arcTrackLine) {
    arcTrackLine.addEventListener('click', (e) => {
      const rect = arcTrackLine.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      state.currentTime = Math.floor(ratio * (state.duration || 228));
      if (elements.nativeAudioPlayer && state.currentCuedTrack?.is_local) {
        elements.nativeAudioPlayer.currentTime = state.currentTime;
      }
      updatePlaybackPosition();
    });
  }

  // Bottom Global Scrubber Seek
  if (elements.globalScrubberBar) {
    elements.globalScrubberBar.addEventListener('click', (e) => {
      const rect = elements.globalScrubberBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      state.currentTime = Math.floor(ratio * (state.duration || 228));
      if (elements.nativeAudioPlayer && state.currentCuedTrack?.is_local) {
        elements.nativeAudioPlayer.currentTime = state.currentTime;
      }
      updatePlaybackPosition();
    });
  }

  // Importer & AI Classifier (Module 2)
  if (elements.btnImport) elements.btnImport.addEventListener('click', handleImportText);
  if (elements.importInput) {
    elements.importInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.importInput.classList.add('drag-over');
    });
    elements.importInput.addEventListener('dragleave', () => {
      elements.importInput.classList.remove('drag-over');
    });
    elements.importInput.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.importInput.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }
  if (elements.btnUploadCsv && elements.fileUploadInput) {
    elements.btnUploadCsv.addEventListener('click', () => elements.fileUploadInput.click());
    elements.fileUploadInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
  }
  if (elements.btnLoadSample) {
    elements.btnLoadSample.addEventListener('click', () => {
      elements.importInput.value = DEMO_TRACKS_INPUT;
    });
  }
  if (elements.btnImportYtLikes) elements.btnImportYtLikes.addEventListener('click', handleImportYtLikes);
  if (elements.btnClearTracks) {
    elements.btnClearTracks.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all imported tracks?')) return;
      await fetch(`${API_BASE}/tracks`, { method: 'DELETE' });
      showToast('Library cleared', 'info');
      await refreshAll();
    });
  }
  if (elements.btnClassify) elements.btnClassify.addEventListener('click', handleClassifyTracks);

  // Filters & Search
  if (elements.filterSearch) {
    elements.filterSearch.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      applyFiltersAndRender();
    });
  }
  if (elements.filterSource) {
    elements.filterSource.addEventListener('change', (e) => {
      state.filters.source = e.target.value;
      applyFiltersAndRender();
    });
  }
  if (elements.filterMainGenre) {
    elements.filterMainGenre.addEventListener('change', (e) => {
      state.filters.mainGenre = e.target.value;
      updateGenreFilterDropdowns();
      applyFiltersAndRender();
    });
  }
  if (elements.filterSubGenre) {
    elements.filterSubGenre.addEventListener('change', (e) => {
      state.filters.subGenre = e.target.value;
      applyFiltersAndRender();
    });
  }

  // View Mode
  if (elements.btnViewGrid) {
    elements.btnViewGrid.addEventListener('click', () => {
      state.viewMode = 'grid';
      elements.btnViewGrid.classList.add('active');
      if (elements.btnViewTable) elements.btnViewTable.classList.remove('active');
      renderStudioContent();
    });
  }
  if (elements.btnViewTable) {
    elements.btnViewTable.addEventListener('click', () => {
      state.viewMode = 'table';
      elements.btnViewTable.classList.add('active');
      if (elements.btnViewGrid) elements.btnViewGrid.classList.remove('active');
      renderStudioContent();
    });
  }

  // Merge & Custom Playlist Triggers
  if (elements.btnOpenMergeModal) elements.btnOpenMergeModal.addEventListener('click', openMergeModal);
  if (elements.btnConfirmMerge) elements.btnConfirmMerge.addEventListener('click', handleConfirmMerge);
  if (elements.btnOpenCustomPlaylistModal) elements.btnOpenCustomPlaylistModal.addEventListener('click', openCustomPlaylistModal);
  if (elements.btnCreateCustomPlaylist) elements.btnCreateCustomPlaylist.addEventListener('click', handleCreateCustomPlaylist);

  if (elements.selectCustomMainGenre) elements.selectCustomMainGenre.addEventListener('change', updateCustomPlaylistPreview);
  if (elements.selectCustomSubGenre) elements.selectCustomSubGenre.addEventListener('change', updateCustomPlaylistPreview);
  if (elements.inputCustomVibeQuery) elements.inputCustomVibeQuery.addEventListener('input', updateCustomPlaylistPreview);

  // Tagger Module Actions (Module 3)
  if (elements.btnTriggerScanPath) elements.btnTriggerScanPath.addEventListener('click', () => handleScanLocalFolder(elements.inputLocalScanPath.value));
  if (elements.btnTagAllLocalTracks) elements.btnTagAllLocalTracks.addEventListener('click', handleTagAllLocalTracks);
  if (elements.btnOrganizeLocalFiles) elements.btnOrganizeLocalFiles.addEventListener('click', handleOrganizeLocalFiles);
  if (elements.btnRefreshLocalList) elements.btnRefreshLocalList.addEventListener('click', () => renderLocalTracksTable());

  // Downloader Module Actions (Module 4)
  if (elements.btnTriggerQuickDownload) elements.btnTriggerQuickDownload.addEventListener('click', handleQuickDownloadFromInput);
  if (elements.inputSingleDownloadUrl) {
    elements.inputSingleDownloadUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickDownloadFromInput();
      }
    });
  }

  // Playlists Studio Buttons (Module 5)
  if (elements.btnOpenCreatePlaylistModal) elements.btnOpenCreatePlaylistModal.addEventListener('click', openCreatePlaylistModal);
  if (elements.btnConfirmCreatePlaylist) elements.btnConfirmCreatePlaylist.addEventListener('click', handleConfirmCreatePlaylist);
  if (elements.btnAutoGeneratePlaylists) elements.btnAutoGeneratePlaylists.addEventListener('click', autoGeneratePlaylists);
  if (elements.btnExportAllPlaylists) elements.btnExportAllPlaylists.addEventListener('click', exportAllPlaylistsToYT);
  if (elements.btnConfirmAddGenreToPlaylist) elements.btnConfirmAddGenreToPlaylist.addEventListener('click', handleConfirmAddGenreToPlaylist);
  if (elements.btnConfirmAddToPlaylist) elements.btnConfirmAddToPlaylist.addEventListener('click', handleConfirmAddToPlaylist);

  // Selection Bar Actions
  if (elements.btnAddSelectedToPlaylist) elements.btnAddSelectedToPlaylist.addEventListener('click', () => openAddToPlaylistModal());
  if (elements.btnDownloadSelectedTracks) elements.btnDownloadSelectedTracks.addEventListener('click', handleDownloadSelectedTracks);
  if (elements.btnTagSelectedTracks) elements.btnTagSelectedTracks.addEventListener('click', handleTagSelectedTracks);
  if (elements.btnDeselectAllTracks) elements.btnDeselectAllTracks.addEventListener('click', deselectAllTracks);

  // Inspector
  if (elements.inspectorSearch) {
    elements.inspectorSearch.addEventListener('input', () => {
      if (state.currentInspectingPlaylist) renderInspectorTracksList(state.currentInspectingPlaylist.tracks || []);
    });
  }
  if (elements.btnInspectorDownloadAll) {
    elements.btnInspectorDownloadAll.addEventListener('click', () => {
      if (state.currentInspectingPlaylist) handleDownloadPlaylist(state.currentInspectingPlaylist.id);
    });
  }
  if (elements.btnInspectorAddGenre) {
    elements.btnInspectorAddGenre.addEventListener('click', () => {
      if (state.currentInspectingPlaylist) openAddGenreModal(state.currentInspectingPlaylist.id);
    });
  }
  if (elements.btnInspectorExportYT) {
    elements.btnInspectorExportYT.addEventListener('click', () => {
      if (state.currentInspectingPlaylist) exportPlaylistToYT(state.currentInspectingPlaylist.id, elements.btnInspectorExportYT);
    });
  }

  // Settings
  if (elements.btnOpenSettings) elements.btnOpenSettings.addEventListener('click', () => openModal(elements.settingsModal));
  if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener('click', handleSaveSettings);
  if (elements.btnConnectYT) elements.btnConnectYT.addEventListener('click', handleConnectYT);

  // Modal Closers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

// -------------------------------------------------------------
// UI Utilities
// -------------------------------------------------------------
function openModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateChip(chipEl, isOnline, textOnline, textOffline) {
  if (!chipEl) return;
  const dot = chipEl.querySelector('.status-dot');
  const label = chipEl.querySelector('span:last-child');
  if (isOnline) {
    if (dot) dot.className = 'status-led led-green';
    if (label) label.textContent = textOnline;
  } else {
    if (dot) dot.className = 'status-led led-red';
    if (label) label.textContent = textOffline;
  }
}

function updateYTAuthBadge(isConnected) {
  const badge = elements.ytAuthIndicator;
  if (!badge) return;
  if (isConnected) {
    badge.innerHTML = `<span class="auth-status-badge badge-connected" style="color: #059669; font-weight: 700;">Connected &bull; Ready to Sync</span>`;
  } else {
    badge.innerHTML = `<span class="auth-status-badge badge-disconnected" style="color: #e53935; font-weight: 700;">Not Connected</span>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', initApp);
