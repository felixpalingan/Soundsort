// SoundSort AI - Modern Frontend Controller & Playlist Studio

const API_BASE = '/api';

const state = {
  allTracks: [],
  tracks: [],
  playlists: [],
  selectedTrackIds: new Set(),
  activeTab: 'library', // 'library' | 'playlists'
  currentInspectingPlaylist: null,
  targetPlaylistForAdd: null,
  allMainGenres: [],
  allSubgenres: [],
  systemStatus: null,
  settings: null,
  viewMode: 'grid', // 'grid' or 'table'
  filters: {
    search: '',
    mainGenre: '',
    subGenre: ''
  }
};

const DEFAULT_THUMB_SVG = 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpolygon points="10 8 16 12 10 16 10 8"/%3E%3C/svg%3E';

function getSafeThumb(url) {
  if (!url || typeof url !== 'string' || url.trim() === '' || url.includes('"') || url.includes('<')) {
    return DEFAULT_THUMB_SVG;
  }
  return encodeURI(url.trim());
}

const DEMO_TRACKS_INPUT = `Arctic Monkeys - 505
Paramore - Misery Business
6arelyhuman - Hands Up!
Sheila On 7 - Dan
Kordhell - Murder In My Mind
S3RL - Bass Slut
YOASOBI - Racing Into The Night
.Feast - Peradaban
Slipknot - Psychosocial
Tenxi - Semangat Pagi`;

// DOM Elements
const elements = {
  // Navigation
  navTabLibrary: document.getElementById('navTabLibrary'),
  navTabPlaylists: document.getElementById('navTabPlaylists'),
  sectionLibrary: document.getElementById('sectionLibrary'),
  sectionPlaylists: document.getElementById('sectionPlaylists'),
  tabCountLibrary: document.getElementById('tabCountLibrary'),
  tabCountPlaylists: document.getElementById('tabCountPlaylists'),

  // Status Chips
  geminiStatusChip: document.getElementById('geminiStatusChip'),
  ytStatusChip: document.getElementById('ytStatusChip'),
  activeModelTag: document.getElementById('activeModelTag'),

  // Stats Counters
  statTotalTracks: document.getElementById('statTotalTracks'),
  statClassified: document.getElementById('statClassified'),
  statSubgenres: document.getElementById('statSubgenres'),
  statSynced: document.getElementById('statSynced'),

  // Importer
  importInput: document.getElementById('importInput'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  btnUploadCsv: document.getElementById('btnUploadCsv'),
  btnImport: document.getElementById('btnImport'),
  importSpinner: document.getElementById('importSpinner'),
  btnLoadSample: document.getElementById('btnLoadSample'),
  btnImportYtLikes: document.getElementById('btnImportYtLikes'),
  btnClearTracks: document.getElementById('btnClearTracks'),

  // AI Hub & Progress
  btnClassify: document.getElementById('btnClassify'),
  btnClassifyText: document.getElementById('btnClassifyText'),
  classifySpinner: document.getElementById('classifySpinner'),
  chkOnlyUncategorized: document.getElementById('chkOnlyUncategorized'),
  aiProgressWrapper: document.getElementById('aiProgressWrapper'),
  aiProgressLabel: document.getElementById('aiProgressLabel'),
  aiProgressPercent: document.getElementById('aiProgressPercent'),
  aiProgressBarFill: document.getElementById('aiProgressBarFill'),
  aiProgressSubtext: document.getElementById('aiProgressSubtext'),

  // Library Studio
  filterSearch: document.getElementById('filterSearch'),
  filterMainGenre: document.getElementById('filterMainGenre'),
  filterSubGenre: document.getElementById('filterSubGenre'),
  btnViewGrid: document.getElementById('btnViewGrid'),
  btnViewTable: document.getElementById('btnViewTable'),
  studioContent: document.getElementById('studioContent'),
  btnOpenMergeModal: document.getElementById('btnOpenMergeModal'),
  btnQuickCreatePlaylistFromFilter: document.getElementById('btnQuickCreatePlaylistFromFilter'),
  btnOpenCustomPlaylistModal: document.getElementById('btnOpenCustomPlaylistModal'),

  // Web Playlists Studio View
  playlistsGrid: document.getElementById('playlistsGrid'),
  btnOpenCreatePlaylistModal: document.getElementById('btnOpenCreatePlaylistModal'),
  btnAutoGeneratePlaylists: document.getElementById('btnAutoGeneratePlaylists'),
  btnExportAllPlaylists: document.getElementById('btnExportAllPlaylists'),

  // Sticky Multi-Selection Bar
  selectionActionBar: document.getElementById('selectionActionBar'),
  selectedCountBadge: document.getElementById('selectedCountBadge'),
  btnAddSelectedToPlaylist: document.getElementById('btnAddSelectedToPlaylist'),
  btnDeselectAllTracks: document.getElementById('btnDeselectAllTracks'),

  // Create Playlist Modal
  createPlaylistModal: document.getElementById('createPlaylistModal'),
  inputNewPlaylistTitle: document.getElementById('inputNewPlaylistTitle'),
  inputNewPlaylistDesc: document.getElementById('inputNewPlaylistDesc'),
  selectNewPlaylistGenre: document.getElementById('selectNewPlaylistGenre'),
  btnConfirmCreatePlaylist: document.getElementById('btnConfirmCreatePlaylist'),

  // Add to Playlist Modal
  addToPlaylistModal: document.getElementById('addToPlaylistModal'),
  addToPlaylistSubtext: document.getElementById('addToPlaylistSubtext'),
  selectTargetPlaylist: document.getElementById('selectTargetPlaylist'),
  inputQuickNewPlaylistTitle: document.getElementById('inputQuickNewPlaylistTitle'),
  btnConfirmAddToPlaylist: document.getElementById('btnConfirmAddToPlaylist'),

  // Add Entire Genre Modal
  addGenreToPlaylistModal: document.getElementById('addGenreToPlaylistModal'),
  addGenreToPlaylistDesc: document.getElementById('addGenreToPlaylistDesc'),
  selectGenreToDump: document.getElementById('selectGenreToDump'),
  btnConfirmAddGenreToPlaylist: document.getElementById('btnConfirmAddGenreToPlaylist'),

  // Playlist Inspector Modal
  playlistInspectorModal: document.getElementById('playlistInspectorModal'),
  inspectorPlaylistTitle: document.getElementById('inspectorPlaylistTitle'),
  inspectorPlaylistDesc: document.getElementById('inspectorPlaylistDesc'),
  inspectorTrackCount: document.getElementById('inspectorTrackCount'),
  inspectorSyncedBadge: document.getElementById('inspectorSyncedBadge'),
  inspectorSearch: document.getElementById('inspectorSearch'),
  inspectorTracksList: document.getElementById('inspectorTracksList'),
  btnInspectorAddGenre: document.getElementById('btnInspectorAddGenre'),
  btnInspectorExportYT: document.getElementById('btnInspectorExportYT'),
  inspectorExportSpinner: document.getElementById('inspectorExportSpinner'),
  inspectorYtLink: document.getElementById('inspectorYtLink'),

  // Custom Playlist Modal
  customPlaylistModal: document.getElementById('customPlaylistModal'),
  inputCustomPlaylistTitle: document.getElementById('inputCustomPlaylistTitle'),
  selectCustomMainGenre: document.getElementById('selectCustomMainGenre'),
  selectCustomSubGenre: document.getElementById('selectCustomSubGenre'),
  inputCustomVibeQuery: document.getElementById('inputCustomVibeQuery'),
  customMatchedCount: document.getElementById('customMatchedCount'),
  customMatchedList: document.getElementById('customMatchedList'),
  btnCreateCustomPlaylist: document.getElementById('btnCreateCustomPlaylist'),
  customPlaylistSpinner: document.getElementById('customPlaylistSpinner'),

  // Modals & Settings
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  settingsModal: document.getElementById('settingsModal'),
  inputGeminiKey: document.getElementById('inputGeminiKey'),
  selectGeminiModel: document.getElementById('selectGeminiModel'),
  inputYtHeaders: document.getElementById('inputYtHeaders'),
  btnConnectYT: document.getElementById('btnConnectYT'),
  ytAuthIndicator: document.getElementById('ytAuthIndicator'),
  inputPlaylistPrefix: document.getElementById('inputPlaylistPrefix'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),

  // Merge Modal
  mergeModal: document.getElementById('mergeModal'),
  selectMergeSource: document.getElementById('selectMergeSource'),
  inputMergeTarget: document.getElementById('inputMergeTarget'),
  existingSubgenresList: document.getElementById('existingSubgenresList'),
  btnConfirmMerge: document.getElementById('btnConfirmMerge'),

  toastContainer: document.getElementById('toastContainer')
};

// -------------------------------------------------------------
// Initialization & Lifecycle
// -------------------------------------------------------------
async function initApp() {
  setupEventListeners();
  await loadSettings();
  await refreshAll();
}

async function refreshAll() {
  await loadStatus();
  await loadTracks();
  await loadPlaylists();
}

// -------------------------------------------------------------
// API Calls & Data Loaders
// -------------------------------------------------------------
async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) return;
    const data = await res.json();
    state.systemStatus = data;

    updateChip(elements.geminiStatusChip, data.gemini_configured, 'Gemini AI Ready', 'Gemini Not Set');
    updateChip(elements.ytStatusChip, data.ytmusic_connected, 'YT Music Connected', 'YT Music Offline');

    elements.statTotalTracks.textContent = data.total_tracks;
    elements.statClassified.textContent = data.classified_tracks;
    elements.statSubgenres.textContent = data.total_subgenres;
    elements.statSynced.textContent = data.synced_tracks;

    elements.tabCountLibrary.textContent = data.total_tracks;
    elements.tabCountPlaylists.textContent = data.total_playlists || 0;
  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) return;
    const data = await res.json();
    state.settings = data;

    if (data.gemini_model) {
      elements.selectGeminiModel.value = data.gemini_model;
      elements.activeModelTag.textContent = data.gemini_model;
    }
    if (data.playlist_prefix) {
      elements.inputPlaylistPrefix.value = data.playlist_prefix;
    }
    if (data.masked_gemini_key) {
      elements.inputGeminiKey.placeholder = `Current Key: ${data.masked_gemini_key}`;
    }

    updateYTAuthBadge(data.ytmusic_connected);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function loadTracks() {
  try {
    const res = await fetch(`${API_BASE}/tracks`);
    if (!res.ok) throw new Error('Failed to load tracks');
    const allTracks = await res.json();
    state.allTracks = allTracks;

    state.allMainGenres = Array.from(new Set(allTracks.map(t => t.main_genre).filter(Boolean))).sort();
    state.allSubgenres = Array.from(new Set(allTracks.map(t => t.sub_genre).filter(Boolean))).sort();

    updateGenreFilterDropdowns();
    applyFiltersAndRender();
  } catch (err) {
    console.error('Error loading tracks:', err);
    showToast('Failed to load tracks', 'error');
  }
}

async function loadPlaylists() {
  try {
    const res = await fetch(`${API_BASE}/playlists`);
    if (!res.ok) return;
    const playlists = await res.json();
    state.playlists = playlists;
    elements.tabCountPlaylists.textContent = playlists.length;
    renderPlaylistsGrid();
  } catch (err) {
    console.error('Error loading playlists:', err);
  }
}

function updateGenreFilterDropdowns() {
  const mainSelect = elements.filterMainGenre;
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
// Tabs Navigation
// -------------------------------------------------------------
function switchTab(tabName) {
  state.activeTab = tabName;
  if (tabName === 'library') {
    elements.navTabLibrary.classList.add('active');
    elements.navTabPlaylists.classList.remove('active');
    elements.sectionLibrary.classList.add('active');
    elements.sectionPlaylists.classList.remove('active');
  } else {
    elements.navTabLibrary.classList.remove('active');
    elements.navTabPlaylists.classList.add('active');
    elements.sectionLibrary.classList.remove('active');
    elements.sectionPlaylists.classList.add('active');
    renderPlaylistsGrid();
  }
}

// -------------------------------------------------------------
// Web Playlists Studio Rendering & Actions
// -------------------------------------------------------------
function renderPlaylistsGrid() {
  const grid = elements.playlistsGrid;
  if (!state.playlists || state.playlists.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
        <div class="empty-icon">📑</div>
        <h3>No Web Playlists Created Yet</h3>
        <p>Create a custom playlist or click <strong>⚡ Auto-Create From Genres</strong> to automatically turn your library genres into playlists!</p>
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-primary" onclick="openCreatePlaylistModal()">➕ Create New Playlist</button>
          <button class="btn btn-secondary" onclick="autoGeneratePlaylists()">⚡ Auto-Create From Genres</button>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  state.playlists.forEach(p => {
    const card = document.createElement('div');
    card.className = `playlist-card ${p.is_synced ? 'is-synced' : ''}`;
    
    const trackCount = p.track_count !== undefined ? p.track_count : (p.track_ids ? p.track_ids.length : 0);
    const syncBadgeHtml = p.is_synced && p.yt_playlist_url
      ? `<a href="${p.yt_playlist_url}" target="_blank" class="badge-synced" title="Open playlist on YouTube Music">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          YT Music ↗
        </a>`
      : `<span class="badge-draft">Web Draft</span>`;

    // Preview preview songs
    let previewHtml = '';
    if (p.tracks_preview && p.tracks_preview.length > 0) {
      previewHtml = `
        <div class="playlist-mini-preview">
          ${p.tracks_preview.map(t => `
            <div class="playlist-mini-song">
              <span class="bullet">&bull;</span>
              <strong>${escapeHtml(t.artist)}</strong> - ${escapeHtml(t.title)}
            </div>
          `).join('')}
          ${trackCount > p.tracks_preview.length ? `<div style="font-size: 0.7rem; color: var(--text-muted); padding-top: 2px;">+ ${trackCount - p.tracks_preview.length} more songs</div>` : ''}
        </div>
      `;
    } else {
      previewHtml = `
        <div class="playlist-mini-preview" style="justify-content: center; align-items: center; color: var(--text-muted); font-size: 0.75rem;">
          Empty playlist (Add songs below)
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="playlist-card-top">
          <div>
            <h3 class="playlist-card-title">${escapeHtml(p.title)}</h3>
          </div>
          ${syncBadgeHtml}
        </div>
        <p class="playlist-card-desc">${escapeHtml(p.description || 'Curated SoundSort Playlist')}</p>
        
        <div class="playlist-card-meta">
          <span class="badge badge-subgenre">🎵 ${trackCount} songs</span>
        </div>

        ${previewHtml}
      </div>

      <div class="playlist-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="openPlaylistInspector('${p.id}')" title="Inspect songs in this playlist">
          👁 View & Edit (${trackCount})
        </button>
        <button class="btn btn-ghost btn-sm" onclick="openAddGenreModal('${p.id}')" title="Add all songs from a genre into this playlist">
          ➕ Add Genre...
        </button>
        <button class="btn-yt-export" onclick="exportPlaylistToYT('${p.id}', this)" title="Export to YouTube Music">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          <span>Export to YT</span>
        </button>
        <button class="btn btn-ghost btn-sm" style="color: var(--accent-red); padding: 6px 8px;" onclick="deleteWebPlaylist('${p.id}')" title="Delete playlist">
          🗑
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

// -------------------------------------------------------------
// Playlists Actions (Create, Delete, Add Genre, Export)
// -------------------------------------------------------------
function openCreatePlaylistModal() {
  elements.inputNewPlaylistTitle.value = '';
  elements.inputNewPlaylistDesc.value = '';
  
  // Populate genres options
  const select = elements.selectNewPlaylistGenre;
  select.innerHTML = '<option value="">-- Start Empty (Add songs manually later) --</option>';
  
  // Collect unique genres
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
  if (!confirm('Are you sure you want to delete this web playlist?')) return;
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
    switchTab('playlists');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddGenreModal(playlistId) {
  state.targetPlaylistForAdd = playlistId;
  const p = state.playlists.find(x => x.id === playlistId);
  elements.addGenreToPlaylistDesc.textContent = `Select a genre from your library to dump all its songs into "${p ? p.title : 'Playlist'}":`;

  const select = elements.selectGenreToDump;
  select.innerHTML = '';
  
  const genres = Array.from(new Set(state.allTracks.map(t => t.assigned_playlist || t.sub_genre || t.main_genre).filter(Boolean))).sort();
  genres.forEach(g => {
    if (g && g !== 'SKIP' && g !== 'General' && g !== 'Uncategorized') {
      const count = state.allTracks.filter(t => (t.assigned_playlist || '').toLowerCase() === g.toLowerCase() || (t.sub_genre || '').toLowerCase() === g.toLowerCase() || (t.main_genre || '').toLowerCase() === g.toLowerCase()).length;
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `${g} (${count} songs)`;
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
    if (!res.ok) throw new Error('Failed to add genre to playlist');
    const data = await res.json();
    
    closeModal(elements.addGenreToPlaylistModal);
    showToast(`Added ${data.added_count} songs from "${genreName}"! Total: ${data.total_tracks} songs.`, 'success');
    await loadPlaylists();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function exportPlaylistToYT(playlistId, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = `⏳ <span>Exporting...</span>`;
  }
  
  showToast('🚀 Syncing playlist to YouTube Music in real-time...', 'info');

  try {
    const res = await fetch(`${API_BASE}/playlists/${playlistId}/export-yt`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Export failed');

    showToast(`🎉 Playlist "${data.title}" successfully exported to YouTube Music! (${data.added_count} songs)`, 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    console.error('Export error:', err);
    showToast(err.message, 'error');
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        <span>Export to YT</span>
      `;
    }
  }
}

async function exportAllPlaylistsToYT() {
  if (!confirm('Export all web playlists to YouTube Music now?')) return;
  const btn = elements.btnExportAllPlaylists;
  btn.disabled = true;
  btn.innerHTML = `<span>⏳ Exporting All Playlists...</span>`;

  try {
    showToast('🚀 Exporting all playlists to YouTube Music...', 'info');
    const res = await fetch(`${API_BASE}/playlists/export-all-yt`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Bulk export failed');

    showToast(`All playlists exported to YouTube Music!`, 'success');
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
      <span>Export All to YouTube Music</span>
    `;
  }
}

// -------------------------------------------------------------
// Playlist Inspector Modal (View & Remove Tracks in Playlist)
// -------------------------------------------------------------
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
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No songs found in this playlist</div>`;
    return;
  }

  container.innerHTML = filtered.map((t, idx) => `
    <div class="inspector-track-item">
      <div class="inspector-track-left">
        <span class="inspector-track-idx">${idx + 1}</span>
        <img class="inspector-track-thumb" src="${getSafeThumb(t.thumbnail)}" alt="cover">
        <div class="inspector-track-info">
          <div class="inspector-track-title">${escapeHtml(t.title)}</div>
          <div class="inspector-track-artist">${escapeHtml(t.artist)} &bull; <span style="color: var(--accent-cyan);">${escapeHtml(t.sub_genre || t.main_genre || '')}</span></div>
        </div>
      </div>
      <div class="inspector-track-right">
        <button class="btn-remove-track" onclick="removeTrackFromCurrentPlaylist('${t.id}')" title="Remove song from playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
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
    
    // Refresh inspector
    await openPlaylistInspector(pid);
    await loadPlaylists();
    showToast('Song removed from playlist', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Multi-Selection and Quick Add to Playlist
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

function selectAllFilteredTracks() {
  state.tracks.forEach(t => state.selectedTrackIds.add(t.id));
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
  elements.selectedCountBadge.textContent = count;
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

function openAddToPlaylistModal(specificTrackId = null) {
  const tids = specificTrackId ? [specificTrackId] : Array.from(state.selectedTrackIds);
  if (tids.length === 0) {
    showToast('No tracks selected', 'error');
    return;
  }

  elements.addToPlaylistSubtext.textContent = `Select which playlist to add ${tids.length} selected song(s) to:`;
  elements.inputQuickNewPlaylistTitle.value = '';

  const select = elements.selectTargetPlaylist;
  select.innerHTML = '';
  if (state.playlists.length === 0) {
    select.innerHTML = '<option value="">-- No playlists yet (type below to create) --</option>';
  } else {
    state.playlists.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.track_count || (p.track_ids ? p.track_ids.length : 0)} songs)`;
      select.appendChild(opt);
    });
  }

  // Store active tids in state
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
      // Create new playlist with these tracks
      const res = await fetch(`${API_BASE}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTitle, track_ids: tids })
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      const newP = await res.json();
      targetPlaylistId = newP.id;
      showToast(`Created playlist "${quickTitle}" with ${tids.length} songs!`, 'success');
    } else if (targetPlaylistId) {
      // Add to existing
      const res = await fetch(`${API_BASE}/playlists/${targetPlaylistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_ids: tids })
      });
      if (!res.ok) throw new Error('Failed to add tracks');
      showToast(`Added ${tids.length} songs to playlist!`, 'success');
    } else {
      showToast('Please select a playlist or enter a new name', 'error');
      return;
    }

    deselectAllTracks();
    closeModal(elements.addToPlaylistModal);
    await loadPlaylists();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickCreatePlaylistFromCurrentFilter() {
  if (!state.tracks || state.tracks.length === 0) {
    showToast('No tracks currently match your filter', 'error');
    return;
  }
  const defaultTitle = state.filters.subGenre || state.filters.mainGenre || 'My Custom Playlist';
  elements.inputNewPlaylistTitle.value = defaultTitle;
  elements.inputNewPlaylistDesc.value = `Created from filtered tracks (${state.tracks.length} songs)`;
  elements.selectNewPlaylistGenre.value = '';
  
  // Store filtered track IDs directly
  state._pendingPrefillTrackIds = state.tracks.map(t => t.id);
  openModal(elements.createPlaylistModal);
}

// -------------------------------------------------------------
// Track Library Filtering & Rendering
// -------------------------------------------------------------
function applyFiltersAndRender() {
  let filtered = [...state.allTracks];
  const q = state.filters.search.trim().toLowerCase();
  const mg = state.filters.mainGenre.trim().toLowerCase();
  const sg = state.filters.subGenre.trim().toLowerCase();

  if (q) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album && t.album.toLowerCase().includes(q)) ||
      (t.sub_genre && t.sub_genre.toLowerCase().includes(q)) ||
      (t.main_genre && t.main_genre.toLowerCase().includes(q)) ||
      (t.vibe && t.vibe.toLowerCase().includes(q))
    );
  }

  if (mg) {
    filtered = filtered.filter(t => (t.main_genre || '').toLowerCase() === mg);
  }

  if (sg) {
    filtered = filtered.filter(t => (t.sub_genre || '').toLowerCase() === sg);
  }

  state.tracks = filtered;
  renderStudioContent();
}

function renderStudioContent() {
  const container = elements.studioContent;
  if (!state.tracks || state.tracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎵</div>
        <h3>No matching tracks found</h3>
        <p>Try clearing your search or genre filters.</p>
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
          <button class="btn btn-secondary btn-xs" onclick="quickCreatePlaylistForGenre('${escapeHtml(genreName)}')">
            ➕ Create Playlist
          </button>
        </div>
      </div>
      <div class="group-card-tracks">
        ${list.map(t => `
          <div class="track-row-compact">
            <input type="checkbox" class="track-select-checkbox" data-track-id="${t.id}" ${state.selectedTrackIds.has(t.id) ? 'checked' : ''} onchange="toggleTrackSelection('${t.id}')">
            <img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover">
            <div class="track-info-mini">
              <span class="track-title-mini" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</span>
              <span class="track-artist-mini" title="${escapeHtml(t.artist)}">${escapeHtml(t.artist)}</span>
            </div>
            <button class="btn-quick-add-pl" onclick="openAddToPlaylistModal('${t.id}')" title="Add to specific playlist">
              + Playlist
            </button>
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
            <th width="40"><input type="checkbox" id="chkSelectAllTable" onchange="toggleSelectAllTable(this)"></th>
            <th width="60">Cover</th>
            <th>Title & Artist</th>
            <th>Main Genre</th>
            <th>Sub-genre</th>
            <th>Vibe / Mood</th>
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.tracks.map(t => `
            <tr>
              <td><input type="checkbox" class="track-select-checkbox" data-track-id="${t.id}" ${state.selectedTrackIds.has(t.id) ? 'checked' : ''} onchange="toggleTrackSelection('${t.id}')"></td>
              <td><img class="track-thumb-mini" src="${getSafeThumb(t.thumbnail)}" alt="cover"></td>
              <td>
                <div class="table-track-title">${escapeHtml(t.title)}</div>
                <div class="table-track-artist">${escapeHtml(t.artist)}</div>
              </td>
              <td><span class="badge badge-main-genre">${escapeHtml(t.main_genre || 'Other')}</span></td>
              <td><span class="badge badge-subgenre">${escapeHtml(t.sub_genre || 'General')}</span></td>
              <td><span class="vibe-tag">${escapeHtml(t.vibe || '-')}</span></td>
              <td>
                <button class="btn-quick-add-pl" onclick="openAddToPlaylistModal('${t.id}')">
                  ➕ Playlist
                </button>
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
    selectAllFilteredTracks();
  } else {
    deselectAllTracks();
  }
}

function quickCreatePlaylistForGenre(genreName) {
  const matchingIds = state.allTracks
    .filter(t => (t.assigned_playlist || '').toLowerCase() === genreName.toLowerCase() || (t.sub_genre || '').toLowerCase() === genreName.toLowerCase() || (t.main_genre || '').toLowerCase() === genreName.toLowerCase())
    .map(t => t.id);

  elements.inputNewPlaylistTitle.value = genreName;
  elements.inputNewPlaylistDesc.value = `Curated ${genreName} collection (${matchingIds.length} songs)`;
  elements.selectNewPlaylistGenre.value = genreName;
  openModal(elements.createPlaylistModal);
}

// -------------------------------------------------------------
// Importers & AI Classification
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
    showToast(`Successfully extracted ${data.total_extracted} tracks (${data.newly_added} newly added)!`, 'success');
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
  if (!state.settings?.has_gemini_key) {
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
              elements.aiProgressLabel.textContent = `Analyzing ${event.total} songs in batches...`;
            } else if (event.type === 'progress') {
              elements.aiProgressPercent.textContent = `${event.percent}%`;
              elements.aiProgressBarFill.style.transform = `scaleX(${event.percent / 100})`;
              elements.aiProgressSubtext.textContent = `${event.processed} / ${event.total} tracks analyzed [${event.model_used}]`;
            } else if (event.type === 'complete') {
              elements.aiProgressLabel.textContent = '✨ Classification Complete!';
              elements.aiProgressBarFill.style.transform = 'scaleX(1)';
              elements.aiProgressPercent.textContent = '100%';
              showToast('Classification completed successfully!', 'success');
            } else if (event.type === 'error') {
              showToast(`Error: ${event.message}`, 'error');
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
    setTimeout(() => {
      elements.aiProgressWrapper.classList.add('hidden');
    }, 4000);
  }
}

// -------------------------------------------------------------
// Settings & Auth Modal
// -------------------------------------------------------------
async function handleSaveSettings() {
  const geminiKey = elements.inputGeminiKey.value.trim();
  const geminiModel = elements.selectGeminiModel.value;
  const prefix = elements.inputPlaylistPrefix.value.trim();

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gemini_api_key: geminiKey || undefined,
        gemini_model: geminiModel,
        playlist_prefix: prefix
      })
    });
    if (!res.ok) throw new Error('Failed to save settings');

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
    showToast('Please paste your YouTube Music browser request headers or cookie', 'error');
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
  // Navigation Tabs
  elements.navTabLibrary.addEventListener('click', () => switchTab('library'));
  elements.navTabPlaylists.addEventListener('click', () => switchTab('playlists'));

  // Importer
  elements.btnImport.addEventListener('click', handleImportText);
  elements.btnUploadCsv.addEventListener('click', () => elements.fileUploadInput.click());
  elements.fileUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });
  elements.btnLoadSample.addEventListener('click', () => {
    elements.importInput.value = DEMO_TRACKS_INPUT;
  });
  elements.btnImportYtLikes.addEventListener('click', handleImportYtLikes);
  elements.btnClearTracks.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all imported tracks?')) return;
    await fetch(`${API_BASE}/tracks`, { method: 'DELETE' });
    showToast('Library cleared', 'info');
    await refreshAll();
  });

  // AI Classifier
  elements.btnClassify.addEventListener('click', handleClassifyTracks);

  // Filters & Search
  elements.filterSearch.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    applyFiltersAndRender();
  });
  elements.filterMainGenre.addEventListener('change', (e) => {
    state.filters.mainGenre = e.target.value;
    updateGenreFilterDropdowns();
    applyFiltersAndRender();
  });
  elements.filterSubGenre.addEventListener('change', (e) => {
    state.filters.subGenre = e.target.value;
    applyFiltersAndRender();
  });

  // View Mode
  elements.btnViewGrid.addEventListener('click', () => {
    state.viewMode = 'grid';
    elements.btnViewGrid.classList.add('active');
    elements.btnViewTable.classList.remove('active');
    renderStudioContent();
  });
  elements.btnViewTable.addEventListener('click', () => {
    state.viewMode = 'table';
    elements.btnViewTable.classList.add('active');
    elements.btnViewGrid.classList.remove('active');
    renderStudioContent();
  });

  // Playlists Studio Buttons
  elements.btnOpenCreatePlaylistModal.addEventListener('click', openCreatePlaylistModal);
  elements.btnConfirmCreatePlaylist.addEventListener('click', handleConfirmCreatePlaylist);
  elements.btnAutoGeneratePlaylists.addEventListener('click', autoGeneratePlaylists);
  elements.btnExportAllPlaylists.addEventListener('click', exportAllPlaylistsToYT);
  elements.btnConfirmAddGenreToPlaylist.addEventListener('click', handleConfirmAddGenreToPlaylist);
  elements.btnConfirmAddToPlaylist.addEventListener('click', handleConfirmAddToPlaylist);
  elements.btnQuickCreatePlaylistFromFilter.addEventListener('click', quickCreatePlaylistFromCurrentFilter);

  // Selection Bar Actions
  elements.btnAddSelectedToPlaylist.addEventListener('click', () => openAddToPlaylistModal());
  elements.btnDeselectAllTracks.addEventListener('click', deselectAllTracks);

  // Inspector Search & Actions
  elements.inspectorSearch.addEventListener('input', () => {
    if (state.currentInspectingPlaylist) {
      renderInspectorTracksList(state.currentInspectingPlaylist.tracks || []);
    }
  });
  elements.btnInspectorAddGenre.addEventListener('click', () => {
    if (state.currentInspectingPlaylist) {
      openAddGenreModal(state.currentInspectingPlaylist.id);
    }
  });
  elements.btnInspectorExportYT.addEventListener('click', () => {
    if (state.currentInspectingPlaylist) {
      exportPlaylistToYT(state.currentInspectingPlaylist.id, elements.btnInspectorExportYT);
    }
  });

  // Settings
  elements.btnOpenSettings.addEventListener('click', () => openModal(elements.settingsModal));
  elements.btnSaveSettings.addEventListener('click', handleSaveSettings);
  elements.btnConnectYT.addEventListener('click', handleConnectYT);

  // Modal Closers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) closeModal(modal);
    });
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

// -------------------------------------------------------------
// UI Utilities (Modals, Toasts, Chips, Helpers)
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
  const label = chipEl.querySelector('.chip-label');
  if (isOnline) {
    dot.className = 'status-dot dot-online';
    label.textContent = textOnline;
  } else {
    dot.className = 'status-dot dot-offline';
    label.textContent = textOffline;
  }
}

function updateYTAuthBadge(isConnected) {
  const badge = elements.ytAuthIndicator;
  if (!badge) return;
  if (isConnected) {
    badge.innerHTML = `<span class="auth-status-badge badge-connected">Connected &bull; Ready to Sync</span>`;
  } else {
    badge.innerHTML = `<span class="auth-status-badge badge-disconnected">Not Connected</span>`;
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
