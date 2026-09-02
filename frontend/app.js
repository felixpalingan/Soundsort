// SoundSort AI - Frontend Controller & State Management

const API_BASE = '/api';

const state = {
  allTracks: [],
  tracks: [],
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

const DEMO_TRACKS_INPUT = `https://open.spotify.com/track/1Qrg8KqiBpW477faSu8NnW
Skrillex & Fred again.. - Rumble
KSLV Noh - Disaster
Bicep - Glue
American Football - Never Meant
Lorna Shore - To the Hellfire
Gunna - fukumean
Peggy Gou - (It Goes Like) Nanana
Deftones - Be Quiet and Drive (Far Away)
Sub Focus & Dimension - Desire
Charli xcx - Von dutch
Overmono - Good Lies
Tatsuro Yamashita - Sparkle
Ken Carson - Overseas
Massive Attack - Teardrop`;

// DOM Elements
const elements = {
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

  // Curation Studio
  filterSearch: document.getElementById('filterSearch'),
  filterMainGenre: document.getElementById('filterMainGenre'),
  filterSubGenre: document.getElementById('filterSubGenre'),
  btnViewGrid: document.getElementById('btnViewGrid'),
  btnViewTable: document.getElementById('btnViewTable'),
  studioContent: document.getElementById('studioContent'),
  btnOpenMergeModal: document.getElementById('btnOpenMergeModal'),
  btnOpenCustomPlaylistModal: document.getElementById('btnOpenCustomPlaylistModal'),

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

  // Sync Modal & Footer
  btnOpenSyncModal: document.getElementById('btnOpenSyncModal'),
  syncModal: document.getElementById('syncModal'),
  syncSubgenresList: document.getElementById('syncSubgenresList'),
  btnSelectAllSync: document.getElementById('btnSelectAllSync'),
  btnDeselectAllSync: document.getElementById('btnDeselectAllSync'),
  btnStartSync: document.getElementById('btnStartSync'),
  syncSpinner: document.getElementById('syncSpinner'),
  syncProgressBox: document.getElementById('syncProgressBox'),
  syncProgressBar: document.getElementById('syncProgressBar'),
  syncStatusMsg: document.getElementById('syncStatusMsg'),
  syncResultsLog: document.getElementById('syncResultsLog'),
  syncBarTitle: document.getElementById('syncBarTitle'),
  syncBarDesc: document.getElementById('syncBarDesc'),

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

    // Update Status Chips
    updateChip(elements.geminiStatusChip, data.gemini_configured, 'Gemini AI Ready', 'Gemini Not Set');
    updateChip(elements.ytStatusChip, data.ytmusic_connected, 'YT Music Connected', 'YT Music Offline');

    // Update Counters
    elements.statTotalTracks.textContent = data.total_tracks;
    elements.statClassified.textContent = data.classified_tracks;
    elements.statSubgenres.textContent = data.total_subgenres;
    elements.statSynced.textContent = data.synced_tracks;

    // Update Sync Bar text
    if (data.total_subgenres > 0) {
      elements.syncBarTitle.textContent = `${data.total_subgenres} Sub-genres Categorized`;
      elements.syncBarDesc.textContent = `${data.total_tracks} total songs ready for YouTube Music export.`;
    } else {
      elements.syncBarTitle.textContent = 'Ready to Create Playlists';
      elements.syncBarDesc.textContent = 'Import songs & run AI classification to generate sub-genre playlists.';
    }

    // Populate filter subgenres dropdown
    populateSubgenreFilter(data.subgenres);
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

    // Master list of all unique genres across the entire library
    state.allMainGenres = Array.from(new Set(allTracks.map(t => t.main_genre).filter(Boolean))).sort();
    state.allSubgenres = Array.from(new Set(allTracks.map(t => t.sub_genre).filter(Boolean))).sort();

    // Populate dropdowns while preserving options
    updateGenreFilterDropdowns();

    // Apply current search/filters and render UI
    applyFiltersAndRender();
  } catch (err) {
    console.error('Error loading tracks:', err);
    showToast('Failed to load tracks', 'error');
  }
}

function updateGenreFilterDropdowns() {
  const mainSelect = elements.filterMainGenre;
  const currentMain = state.filters.mainGenre || '';

  // Main genres ALWAYS retains all available main genres
  mainSelect.innerHTML = '<option value="">All Main Genres</option>';
  state.allMainGenres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    mainSelect.appendChild(opt);
  });
  mainSelect.value = currentMain;

  // Sub-genres dropdown (contextually filtered by selected main genre if set, or shows all)
  const subSelect = elements.filterSubGenre;
  const currentSub = state.filters.subGenre || '';

  let availableSubs = state.allTracks;
  if (currentMain) {
    availableSubs = availableSubs.filter(t => t.main_genre === currentMain);
  }
  const uniqueSubs = Array.from(new Set(availableSubs.map(t => t.sub_genre).filter(Boolean))).sort();

  subSelect.innerHTML = '<option value="">All Sub-genres</option>';
  uniqueSubs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    subSelect.appendChild(opt);
  });
  subSelect.value = uniqueSubs.includes(currentSub) ? currentSub : '';
}

function applyFiltersAndRender() {
  let filtered = state.allTracks;

  const query = (state.filters.search || '').toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(t => 
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.artist && t.artist.toLowerCase().includes(query)) ||
      (t.sub_genre && t.sub_genre.toLowerCase().includes(query)) ||
      (t.main_genre && t.main_genre.toLowerCase().includes(query)) ||
      (t.vibe && t.vibe.toLowerCase().includes(query))
    );
  }

  if (state.filters.mainGenre) {
    filtered = filtered.filter(t => t.main_genre === state.filters.mainGenre);
  }

  if (state.filters.subGenre) {
    filtered = filtered.filter(t => t.sub_genre === state.filters.subGenre);
  }

  state.tracks = filtered;
  renderStudioContent();
}

// -------------------------------------------------------------
// UI Rendering
// -------------------------------------------------------------
function renderStudioContent() {
  const container = elements.studioContent;
  container.innerHTML = '';

  if (!state.tracks || state.tracks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎵</div>
        <h3>No tracks found</h3>
        <p>Import songs using the box above or click <strong>✨ Load Demo Tracks</strong> to see SoundSort AI in action!</p>
      </div>
    `;
    return;
  }

  if (state.viewMode === 'grid') {
    renderSubgenreGrid(container);
  } else {
    renderTableView(container);
  }
}

function renderSubgenreGrid(container) {
  // Group tracks by sub_genre
  const groups = {};
  state.tracks.forEach(track => {
    const sub = track.sub_genre || 'Uncategorized';
    if (!groups[sub]) {
      groups[sub] = {
        subGenre: sub,
        mainGenre: track.main_genre || 'General',
        tracks: []
      };
    }
    groups[sub].tracks.push(track);
  });

  const grid = document.createElement('div');
  grid.className = 'subgenre-grid';

  const sortedSubgenres = Object.keys(groups).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  sortedSubgenres.forEach(subName => {
    const group = groups[subName];
    const card = document.createElement('div');
    card.className = 'subgenre-card';

    const header = document.createElement('div');
    header.className = 'subgenre-card-header';
    header.innerHTML = `
      <div class="subgenre-name-group">
        <span class="genre-dot"></span>
        <div>
          <span class="subgenre-title">${escapeHtml(group.subGenre)}</span>
          <span class="main-genre-pill">${escapeHtml(group.mainGenre)}</span>
        </div>
      </div>
      <span class="subgenre-count">${group.tracks.length} songs</span>
    `;

    const body = document.createElement('div');
    body.className = 'subgenre-card-body';

    group.tracks.forEach(track => {
      const row = document.createElement('div');
      row.className = 'track-row';

      const thumbUrl = getSafeThumb(track.thumbnail);
      const sourceBadge = getSourceBadgeHtml(track.source_platform);

      const fullDesc = `🎵 ${track.title}\n👤 Artist: ${track.artist}${track.album ? '\n💿 Album: ' + track.album : ''}\n🏷️ Sub-genre: ${track.sub_genre || 'Uncategorized'} (${track.main_genre || 'General'})${track.vibe ? '\n✨ Vibe: ' + track.vibe : ''}\n🌐 Source: ${(track.source_platform || 'manual').toUpperCase()}`;
      row.setAttribute('title', fullDesc);

      row.innerHTML = `
        <img class="track-thumb" src="${thumbUrl}" alt="Cover" loading="lazy">
        <div class="track-info">
          <div class="track-title">${escapeHtml(track.title)}</div>
          <div class="track-artist">${escapeHtml(track.artist)}</div>
        </div>
        <div class="track-meta-pills">
          ${track.vibe ? `<span class="vibe-tag" title="✨ Vibe: ${escapeHtml(track.vibe)}">${escapeHtml(track.vibe)}</span>` : ''}
          ${sourceBadge}
        </div>
        <div class="track-actions">
          <button class="action-btn-sm btn-edit" title="Change Sub-genre" data-id="${track.id}">✏️</button>
          <button class="action-btn-sm btn-delete" title="Remove song" data-id="${track.id}">&times;</button>
        </div>
      `;

      // Safe fallback on load error
      const img = row.querySelector('.track-thumb');
      if (img) {
        img.onerror = () => { img.src = DEFAULT_THUMB_SVG; };
      }

      // Event listeners for actions
      row.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        promptEditTrackGenre(track);
      });
      row.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteTrack(track.id);
      });

      body.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(body);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderTableView(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'studio-table-container';

  let html = `
    <table class="studio-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Track & Artist</th>
          <th>Main Genre</th>
          <th>Sub-genre</th>
          <th>Vibe</th>
          <th>Source</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.tracks.forEach((track, i) => {
    const thumbUrl = getSafeThumb(track.thumbnail);
    const sourceBadge = getSourceBadgeHtml(track.source_platform);
    const fullDesc = `🎵 ${track.title}\n👤 Artist: ${track.artist}${track.album ? '\n💿 Album: ' + track.album : ''}\n🏷️ Sub-genre: ${track.sub_genre || 'Uncategorized'}`;

    html += `
      <tr data-id="${track.id}" title="${escapeHtml(fullDesc)}">
        <td>${i + 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${thumbUrl}" class="table-track-thumb" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;" loading="lazy">
            <div>
              <div style="font-weight: 600; font-size: 0.92rem; color: #ffffff;">${escapeHtml(track.title)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(track.artist)}</div>
            </div>
          </div>
        </td>
        <td><span class="main-genre-pill">${escapeHtml(track.main_genre || 'Uncategorized')}</span></td>
        <td>
          <input type="text" class="inline-genre-edit" value="${escapeHtml(track.sub_genre || '')}" data-id="${track.id}" data-field="sub_genre">
        </td>
        <td><span class="vibe-tag" title="✨ Vibe: ${escapeHtml(track.vibe || '')}">${escapeHtml(track.vibe || '-')}</span></td>
        <td>${sourceBadge}</td>
        <td style="text-align: right;">
          <button class="action-btn-sm btn-delete" title="Delete" data-id="${track.id}">&times;</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  wrapper.innerHTML = html;

  wrapper.querySelectorAll('.table-track-thumb').forEach(img => {
    img.onerror = () => { img.src = DEFAULT_THUMB_SVG; };
  });

  // Listeners for inline inputs
  wrapper.querySelectorAll('.inline-genre-edit').forEach(input => {
    input.addEventListener('change', async (e) => {
      const trackId = e.target.getAttribute('data-id');
      const newSub = e.target.value.trim();
      if (newSub) {
        await updateTrackField(trackId, { sub_genre: newSub });
      }
    });
  });

  wrapper.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trackId = e.target.getAttribute('data-id');
      handleDeleteTrack(trackId);
    });
  });

  container.appendChild(wrapper);
}

function getSourceBadgeHtml(platform) {
  if (platform === 'spotify') return '<span class="badge badge-spotify">Spotify</span>';
  if (platform === 'soundcloud') return '<span class="badge badge-soundcloud">SoundCloud</span>';
  if (platform === 'youtube') return '<span class="badge badge-yt">YT</span>';
  return '<span class="badge badge-text">Manual</span>';
}

function updateChip(chipEl, isOnline, onlineText, offlineText) {
  const dot = chipEl.querySelector('.status-dot');
  const label = chipEl.querySelector('.chip-label');
  if (isOnline) {
    dot.className = 'status-dot dot-online';
    label.textContent = onlineText;
  } else {
    dot.className = 'status-dot dot-offline';
    label.textContent = offlineText;
  }
}

function updateYTAuthBadge(isConnected) {
  if (isConnected) {
    elements.ytAuthIndicator.innerHTML = '<span class="auth-status-badge badge-connected">✓ Connected to YouTube Music</span>';
  } else {
    elements.ytAuthIndicator.innerHTML = '<span class="auth-status-badge badge-disconnected">&times; Not Connected</span>';
  }
}

// -------------------------------------------------------------
// Actions & Handlers
// -------------------------------------------------------------
async function handleImport() {
  const text = elements.importInput.value.trim();
  if (!text) {
    showToast('Please paste track links, CSV data, or upload a file.', 'info');
    return;
  }

  elements.importSpinner.classList.remove('hidden');
  elements.btnImport.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/tracks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_text: text })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Import failed');

    showToast(`Successfully extracted ${data.newly_added} new tracks!`, 'success');
    elements.importInput.value = '';
    await refreshAll();
  } catch (err) {
    showToast(err.message || 'Import error', 'error');
  } finally {
    elements.importSpinner.classList.add('hidden');
    elements.btnImport.disabled = false;
  }
}

async function handleFileUpload(file) {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  elements.importSpinner.classList.remove('hidden');
  elements.btnImport.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/tracks/import/file`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'File import failed');

    showToast(`🎉 Imported ${data.newly_added} tracks from ${file.name}!`, 'success');
    elements.importInput.value = '';
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.importSpinner.classList.add('hidden');
    elements.btnImport.disabled = false;
    elements.fileUploadInput.value = '';
  }
}

async function handleImportYtLikes() {
  if (!state.systemStatus?.ytmusic_connected) {
    openModal('settingsModal');
    showToast('Please connect your YouTube Music account in Settings first.', 'info');
    return;
  }

  elements.btnImportYtLikes.disabled = true;
  elements.btnImportYtLikes.textContent = '⏳ Loading all Liked Songs...';

  try {
    const res = await fetch(`${API_BASE}/tracks/import/yt-likes`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch Liked Songs');

    showToast(`🎉 Imported ${data.newly_added} liked songs from YouTube Music!`, 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.btnImportYtLikes.disabled = false;
    elements.btnImportYtLikes.textContent = '❤️ YT Music Likes';
  }
}

async function handleClassify() {
  if (state.tracks.length === 0) {
    showToast('No tracks to classify! Import some tracks first.', 'info');
    return;
  }

  const onlyUncategorized = elements.chkOnlyUncategorized ? elements.chkOnlyUncategorized.checked : true;
  const unclassifiedCount = state.tracks.filter(t => !t.sub_genre || t.sub_genre === 'General' || t.main_genre === 'Uncategorized').length;

  if (onlyUncategorized && unclassifiedCount === 0) {
    showToast('🎉 Semua lagu sudah selesai diklasifikasikan! Hilangkan centang jika ingin re-classify seluruhnya.', 'info');
    return;
  }

  const targetCount = onlyUncategorized ? unclassifiedCount : state.tracks.length;

  // Show UI live progress wrapper
  elements.aiProgressWrapper.classList.remove('hidden');
  elements.aiProgressBarFill.style.width = '0%';
  elements.aiProgressPercent.textContent = '0%';
  elements.aiProgressLabel.textContent = `✨ Memulai klasifikasi ${targetCount} lagu...`;
  elements.aiProgressSubtext.textContent = `0 / ${targetCount} tracks analyzed`;

  elements.classifySpinner.classList.remove('hidden');
  elements.btnClassify.disabled = true;
  elements.btnClassifyText.textContent = 'Classifying in progress...';

  try {
    const response = await fetch(`${API_BASE}/tracks/classify/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ only_uncategorized: onlyUncategorized })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.detail?.includes('API Key is missing') || response.status === 400) {
        openModal('settingsModal');
        throw new Error('Please enter your Gemini API Key in Settings first!');
      }
      throw new Error(errData.detail || 'Classification failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // keep partial chunk

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'start') {
            elements.aiProgressLabel.textContent = `Processing in micro-batches of ${event.batch_size}...`;
            elements.aiProgressSubtext.textContent = `0 / ${event.total} tracks`;
          } else if (event.type === 'progress') {
            elements.aiProgressBarFill.style.width = `${event.percent}%`;
            elements.aiProgressPercent.textContent = `${event.percent}%`;
            elements.aiProgressLabel.textContent = `✨ Analyzing with ${event.model_used || 'Gemini'}...`;
            elements.aiProgressSubtext.textContent = `${event.processed} / ${event.total} tracks categorized (${event.percent}%)`;

            // Live update tracks & counters in memory
            if (event.batch_tracks && event.batch_tracks.length > 0) {
              const updatedMap = new Map(event.batch_tracks.map(t => [t.id, t]));
              state.allTracks = state.allTracks.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id) : t);
              state.tracks = state.tracks.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id) : t);
              
              state.allMainGenres = Array.from(new Set(state.allTracks.map(t => t.main_genre).filter(Boolean))).sort();
              state.allSubgenres = Array.from(new Set(state.allTracks.map(t => t.sub_genre).filter(Boolean))).sort();
              updateGenreFilterDropdowns();

              const classifiedCount = state.allTracks.filter(t => t.sub_genre && t.sub_genre !== 'General' && t.main_genre !== 'Uncategorized').length;
              elements.statClassified.textContent = classifiedCount;
              
              const uniqueSubs = new Set(state.allTracks.map(t => t.sub_genre).filter(Boolean));
              elements.statSubgenres.textContent = uniqueSubs.size;

              // Dynamically re-render cards/table as batches arrive!
              renderStudioContent();
            }
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Error occurred during classification');
          } else if (event.type === 'complete') {
            elements.aiProgressBarFill.style.width = '100%';
            elements.aiProgressPercent.textContent = '100%';
            elements.aiProgressLabel.textContent = '✓ AI Classification Complete!';
            showToast(`🎉 Successfully classified ${event.total_classified} songs!`, 'success');
          }
        } catch (e) {
          console.warn('Event parse error:', e);
        }
      }
    }

    await refreshAll();
  } catch (err) {
    elements.aiProgressLabel.textContent = `❌ ${err.message}`;
    showToast(err.message, 'error');
  } finally {
    elements.classifySpinner.classList.add('hidden');
    elements.btnClassify.disabled = false;
    elements.btnClassifyText.textContent = '✨ Run AI Sub-genre Classifier';
    setTimeout(() => {
      elements.aiProgressWrapper.classList.add('hidden');
    }, 5000);
  }
}

async function promptEditTrackGenre(track) {
  const newSub = prompt(`Change sub-genre for "${track.title}" by ${track.artist}:`, track.sub_genre || '');
  if (newSub !== null && newSub.trim() && newSub.trim() !== track.sub_genre) {
    await updateTrackField(track.id, { sub_genre: newSub.trim() });
  }
}

async function updateTrackField(trackId, updates) {
  try {
    const res = await fetch(`${API_BASE}/tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Update failed');
    showToast('Updated sub-genre', 'success');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteTrack(trackId) {
  try {
    const res = await fetch(`${API_BASE}/tracks/${trackId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast('Track removed', 'info');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleClearAll() {
  if (state.tracks.length === 0) return;
  if (!confirm('Are you sure you want to clear all tracks from the library?')) return;

  try {
    const res = await fetch(`${API_BASE}/tracks`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Clear failed');
    showToast('All tracks cleared', 'info');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// Merge Subgenres
// -------------------------------------------------------------
function openMergeModal() {
  const subgenres = (state.systemStatus?.subgenres || []).filter(Boolean);
  if (subgenres.length === 0) {
    showToast('No sub-genres to merge yet.', 'info');
    return;
  }

  elements.selectMergeSource.innerHTML = '';
  elements.existingSubgenresList.innerHTML = '';

  subgenres.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    elements.selectMergeSource.appendChild(opt);

    const dataOpt = document.createElement('option');
    dataOpt.value = s;
    elements.existingSubgenresList.appendChild(dataOpt);
  });

  elements.inputMergeTarget.value = '';
  openModal('mergeModal');
}

async function handleConfirmMerge() {
  const source = elements.selectMergeSource.value;
  const target = elements.inputMergeTarget.value.trim();

  if (!source || !target) {
    showToast('Please specify both source and target sub-genres.', 'info');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/genres/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_subgenre: source,
        new_subgenre: target
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Merge failed');

    showToast(data.message || 'Merged sub-genres successfully!', 'success');
    closeModal('mergeModal');
    await refreshAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// YouTube Music Sync
// -------------------------------------------------------------
function openSyncModal() {
  if (state.tracks.length === 0) {
    showToast('No tracks in library to sync!', 'info');
    return;
  }

  const subgenres = (state.systemStatus?.subgenres || []).filter(Boolean);
  const container = elements.syncSubgenresList;
  container.innerHTML = '';

  // Count tracks per subgenre
  const counts = {};
  state.tracks.forEach(t => {
    const s = t.sub_genre || 'General';
    counts[s] = (counts[s] || 0) + 1;
  });

  subgenres.forEach(subName => {
    const count = counts[subName] || 0;
    const item = document.createElement('label');
    item.className = 'sync-subgenre-item';
    item.innerHTML = `
      <input type="checkbox" value="${escapeHtml(subName)}" checked>
      <span class="sync-item-label">${escapeHtml(subName)}</span>
      <span class="sync-item-badge">${count} songs</span>
    `;
    container.appendChild(item);
  });

  elements.syncProgressBox.classList.add('hidden');
  elements.syncResultsLog.innerHTML = '';
  elements.syncProgressBar.style.width = '0%';
  openModal('syncModal');
}

async function handleStartSync() {
  const checkedInputs = elements.syncSubgenresList.querySelectorAll('input[type="checkbox"]:checked');
  const selectedSubgenres = Array.from(checkedInputs).map(cb => cb.value);

  if (selectedSubgenres.length === 0) {
    showToast('Please select at least one sub-genre to export.', 'info');
    return;
  }

  // Check YT Music auth
  if (!state.systemStatus?.ytmusic_connected) {
    closeModal('syncModal');
    openModal('settingsModal');
    showToast('Please connect your YouTube Music account in Settings first.', 'info');
    return;
  }

  elements.syncSpinner.classList.remove('hidden');
  elements.btnStartSync.disabled = true;
  elements.syncProgressBox.classList.remove('hidden');
  elements.syncStatusMsg.textContent = `Creating ${selectedSubgenres.length} playlists on YouTube Music...`;
  elements.syncProgressBar.style.width = '20%';

  try {
    const res = await fetch(`${API_BASE}/ytmusic/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subgenres: selectedSubgenres,
        playlist_prefix: elements.inputPlaylistPrefix.value || 'SoundSort: '
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Sync failed');

    elements.syncProgressBar.style.width = '100%';
    elements.syncStatusMsg.textContent = `✓ Successfully exported ${data.playlists.length} playlists!`;

    // Render results log
    let logHtml = '';
    data.playlists.forEach(pl => {
      if (pl.success !== false) {
        logHtml += `
          <div class="sync-log-success">
            ✓ <strong>${escapeHtml(pl.playlist_title)}</strong>: ${pl.added_count}/${pl.total_requested} tracks &bull;
            <a href="${pl.playlist_url}" target="_blank" rel="noopener">Open in YouTube Music &rarr;</a>
          </div>
        `;
      } else {
        logHtml += `<div style="color: #ef4444;">&times; Failed for ${escapeHtml(pl.subgenre)}: ${pl.error}</div>`;
      }
    });

    elements.syncResultsLog.innerHTML = logHtml;
    showToast('Playlists created in YouTube Music!', 'success');
    await refreshAll();
  } catch (err) {
    elements.syncStatusMsg.textContent = `Sync Error: ${err.message}`;
    showToast(err.message, 'error');
  } finally {
    elements.syncSpinner.classList.add('hidden');
    elements.btnStartSync.disabled = false;
  }
}

// -------------------------------------------------------------
// Settings & Connect YT
// -------------------------------------------------------------
async function handleSaveSettings() {
  const geminiKey = elements.inputGeminiKey.value.trim();
  const model = elements.selectGeminiModel.value;
  const prefix = elements.inputPlaylistPrefix.value;

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gemini_api_key: geminiKey || undefined,
        gemini_model: model,
        playlist_prefix: prefix
      })
    });
    if (!res.ok) throw new Error('Failed to save settings');
    showToast('Settings saved successfully!', 'success');
    closeModal('settingsModal');
    await loadSettings();
    await loadStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleConnectYT() {
  const raw = elements.inputYtHeaders.value.trim();
  if (!raw) {
    showToast('Please paste the YouTube Music browser request headers.', 'info');
    return;
  }

  elements.btnConnectYT.disabled = true;
  elements.btnConnectYT.textContent = 'Connecting...';

  try {
    const res = await fetch(`${API_BASE}/ytmusic/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers_raw: raw })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Connection failed');

    showToast('YouTube Music connected successfully!', 'success');
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
// Custom Playlist Builder by Genre & Vibe
// -------------------------------------------------------------
let currentCustomMatchedTracks = [];

function openCustomPlaylistModal() {
  if (state.allTracks.length === 0) {
    showToast('Import songs first to build a custom playlist.', 'info');
    return;
  }

  // Populate main genre dropdown
  const mainSelect = elements.selectCustomMainGenre;
  mainSelect.innerHTML = '<option value="">All Main Genres</option>';
  state.allMainGenres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    mainSelect.appendChild(opt);
  });

  updateCustomSubgenreDropdown();

  elements.inputCustomPlaylistTitle.value = '';
  elements.inputCustomVibeQuery.value = '';
  
  updateCustomPlaylistPreview();
  openModal('customPlaylistModal');
}

function updateCustomSubgenreDropdown() {
  const selectedMain = elements.selectCustomMainGenre.value;
  const subSelect = elements.selectCustomSubGenre;
  
  let availableSubs = state.allTracks;
  if (selectedMain) {
    availableSubs = availableSubs.filter(t => t.main_genre === selectedMain);
  }
  const uniqueSubs = Array.from(new Set(availableSubs.map(t => t.sub_genre).filter(Boolean))).sort();

  subSelect.innerHTML = '<option value="">All Sub-genres</option>';
  uniqueSubs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    subSelect.appendChild(opt);
  });
}

function updateCustomPlaylistPreview() {
  const selectedMain = elements.selectCustomMainGenre.value;
  const selectedSub = elements.selectCustomSubGenre.value;
  const vibeQuery = (elements.inputCustomVibeQuery.value || '').toLowerCase().trim();

  let matched = state.allTracks;

  if (selectedMain) {
    matched = matched.filter(t => t.main_genre === selectedMain);
  }
  if (selectedSub) {
    matched = matched.filter(t => t.sub_genre === selectedSub);
  }
  if (vibeQuery) {
    matched = matched.filter(t => 
      (t.vibe && t.vibe.toLowerCase().includes(vibeQuery)) ||
      (t.sub_genre && t.sub_genre.toLowerCase().includes(vibeQuery)) ||
      (t.title && t.title.toLowerCase().includes(vibeQuery)) ||
      (t.artist && t.artist.toLowerCase().includes(vibeQuery))
    );
  }

  currentCustomMatchedTracks = matched;
  elements.customMatchedCount.textContent = matched.length;

  if (matched.length === 0) {
    elements.customMatchedList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; text-align: center; padding: 12px;">No songs match the current genre/vibe filters.</div>';
    return;
  }

  elements.customMatchedList.innerHTML = matched.slice(0, 100).map((t, idx) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.8rem;">
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65%;">
        <strong>${idx + 1}. ${escapeHtml(t.title)}</strong> <span style="color: var(--text-muted); font-size: 0.75rem;">- ${escapeHtml(t.artist)}</span>
      </div>
      <div style="display: flex; gap: 5px; flex-shrink: 0;">
        <span class="vibe-tag" style="font-size: 0.6rem; max-width: 90px;">${escapeHtml(t.sub_genre || t.main_genre || 'Music')}</span>
        ${t.vibe ? `<span class="vibe-tag" style="font-size: 0.6rem; color: #a855f7; border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.1); max-width: 90px;">${escapeHtml(t.vibe)}</span>` : ''}
      </div>
    </div>
  `).join('');

  if (matched.length > 100) {
    elements.customMatchedList.innerHTML += `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); padding: 6px;">...and ${matched.length - 100} more songs</div>`;
  }
}

async function handleCreateCustomPlaylist() {
  if (!state.systemStatus?.ytmusic_connected) {
    openModal('settingsModal');
    showToast('Please connect your YouTube Music account in Settings first.', 'info');
    return;
  }

  const title = elements.inputCustomPlaylistTitle.value.trim();
  if (!title) {
    showToast('Please enter a title for your new playlist.', 'error');
    elements.inputCustomPlaylistTitle.focus();
    return;
  }

  if (currentCustomMatchedTracks.length === 0) {
    showToast('No matching songs to add. Please adjust your filters.', 'error');
    return;
  }

  elements.customPlaylistSpinner.classList.remove('hidden');
  elements.btnCreateCustomPlaylist.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ytmusic/custom-playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        description: `Custom mix curated with SoundSort AI (${currentCustomMatchedTracks.length} tracks)`,
        track_ids: currentCustomMatchedTracks.map(t => t.id)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create custom playlist');

    showToast(`🎉 Playlist "${title}" created with ${data.added_count} songs!`, 'success');
    closeModal('customPlaylistModal');
    
    if (data.playlist_url) {
      window.open(data.playlist_url, '_blank');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.customPlaylistSpinner.classList.add('hidden');
    elements.btnCreateCustomPlaylist.disabled = false;
  }
}

// -------------------------------------------------------------
// Modal & Utility Helpers
// -------------------------------------------------------------
function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
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

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  // Importer
  elements.btnImport.addEventListener('click', handleImport);
  elements.btnImportYtLikes.addEventListener('click', handleImportYtLikes);
  elements.btnUploadCsv.addEventListener('click', () => elements.fileUploadInput.click());
  elements.fileUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  // Drag and Drop support on textarea
  const dropTarget = elements.importInput;
  dropTarget.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropTarget.style.borderColor = 'var(--accent-cyan)';
    dropTarget.style.background = 'rgba(0, 242, 254, 0.05)';
  });
  dropTarget.addEventListener('dragleave', (e) => {
    dropTarget.style.borderColor = '';
    dropTarget.style.background = '';
  });
  dropTarget.addEventListener('drop', (e) => {
    e.preventDefault();
    dropTarget.style.borderColor = '';
    dropTarget.style.background = '';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  elements.btnLoadSample.addEventListener('click', () => {
    elements.importInput.value = DEMO_TRACKS_INPUT;
    showToast('Demo playlist links & track names loaded into input!', 'info');
  });
  elements.btnClearTracks.addEventListener('click', handleClearAll);

  // AI Classification
  elements.btnClassify.addEventListener('click', handleClassify);

  // Filters & Search
  elements.filterSearch.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    applyFiltersAndRender();
  });
  elements.filterMainGenre.addEventListener('change', (e) => {
    state.filters.mainGenre = e.target.value;
    state.filters.subGenre = ''; // Reset subgenre when main genre changes
    updateGenreFilterDropdowns();
    applyFiltersAndRender();
  });
  elements.filterSubGenre.addEventListener('change', (e) => {
    state.filters.subGenre = e.target.value;
    applyFiltersAndRender();
  });

  // View Mode Toggles
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

  // Modals Open/Close
  elements.btnOpenSettings.addEventListener('click', () => openModal('settingsModal'));
  elements.btnOpenMergeModal.addEventListener('click', openMergeModal);
  elements.btnOpenSyncModal.addEventListener('click', openSyncModal);
  elements.btnOpenCustomPlaylistModal.addEventListener('click', openCustomPlaylistModal);

  // Custom Playlist Filtering & Creation
  elements.selectCustomMainGenre.addEventListener('change', () => {
    updateCustomSubgenreDropdown();
    updateCustomPlaylistPreview();
  });
  elements.selectCustomSubGenre.addEventListener('change', updateCustomPlaylistPreview);
  elements.inputCustomVibeQuery.addEventListener('input', updateCustomPlaylistPreview);
  elements.btnCreateCustomPlaylist.addEventListener('click', handleCreateCustomPlaylist);

  // Modal Close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  // Settings Save & Connect
  elements.btnSaveSettings.addEventListener('click', handleSaveSettings);
  elements.btnConnectYT.addEventListener('click', handleConnectYT);

  // Merge Subgenres
  elements.btnConfirmMerge.addEventListener('click', handleConfirmMerge);

  // Sync Modal Checkbox helpers
  elements.btnSelectAllSync.addEventListener('click', () => {
    elements.syncSubgenresList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  });
  elements.btnDeselectAllSync.addEventListener('click', () => {
    elements.syncSubgenresList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  });
  elements.btnStartSync.addEventListener('click', handleStartSync);
}

// Run on page load
document.addEventListener('DOMContentLoaded', initApp);
