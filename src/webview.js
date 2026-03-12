var state = {
	tree: [],
	expandedFolders: {},
	folderChildren: {},
	selectedNoteId: null,
	selectedFolderId: null,
	sortMode: 'title-asc',
	searchQuery: '',
	isSearchMode: false,
	activeTab: 'notebooks',
	tocHeadings: [],
	tocNoteTitle: '',
	filters: {
		includeNotes: true,
		includeNotebooks: true,
		dateAfter: null,
		dateBefore: null,
	},
	filterPanelOpen: false,
	syncStatus: 'idle',
	syncLogs: [],
	syncLogOpen: false,
	excludedFolderIds: [],
	excludedNoteIds: [],
	searchHistory: [],
	searchHistoryOpen: false,
	searchHistoryShowAll: false,
};

var SVG_CHEVRON_RIGHT = '<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/></svg>';
var SVG_CHEVRON_DOWN = '<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M12.78 6.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 1.06-1.06L8 9.94l3.72-3.72a.75.75 0 0 1 1.06 0z"/></svg>';
var SVG_FOLDER = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="#e8a838" d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/></svg>';
var SVG_FOLDER_OPEN = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="#e8a838" d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.5A1.75 1.75 0 0 1 16 4.75v.462a.25.25 0 0 1-.03.118.75.75 0 0 0 .027-.082l-1.89 7.556A1.75 1.75 0 0 1 12.41 14H1.75A1.75 1.75 0 0 1 0 12.25V2.75c0-.464.184-.91.513-1.237z"/></svg>';
var SVG_NOTE = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 0 0-.011-.013L10.513 1.562a.236.236 0 0 0-.013-.011z"/></svg>';
var SVG_TODO = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm0-1.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z"/></svg>';
var SVG_TODO_DONE = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="#2ea44f" d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm3.78-9.72a.751.751 0 0 0-1.042-.018.751.751 0 0 0-.018 1.042L7.25 10.94 5.28 8.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042l2.5 2.5a.75.75 0 0 0 1.06 0l4-4z"/></svg>';
var SVG_SPACER = '<span class="fnv-icon-spacer"></span>';

function escapeHtml(text) {
	var div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function getFolderEmoji(folder) {
	if (!folder.icon) return null;
	try {
		var iconData = typeof folder.icon === 'string' ? JSON.parse(folder.icon) : folder.icon;
		if (iconData && iconData.type === 1 && iconData.emoji) {
			return iconData.emoji;
		}
	} catch (e) {
		// icon is not valid JSON, ignore
	}
	return null;
}

function getNoteIcon(item) {
	if (item.is_todo) {
		return item.todo_completed ? SVG_TODO_DONE : SVG_TODO;
	}
	return SVG_NOTE;
}

function sortItems(items, sortMode) {
	var sorted = items.slice();
	switch (sortMode) {
		case 'title-asc':
			sorted.sort(function (a, b) { return a.title.localeCompare(b.title); });
			break;
		case 'title-desc':
			sorted.sort(function (a, b) { return b.title.localeCompare(a.title); });
			break;
		case 'date-desc':
			sorted.sort(function (a, b) { return (b.updated_time || 0) - (a.updated_time || 0); });
			break;
		case 'date-asc':
			sorted.sort(function (a, b) { return (a.updated_time || 0) - (b.updated_time || 0); });
			break;
	}
	return sorted;
}

function renderFolderNode(folder, depth) {
	var isExpanded = !!state.expandedFolders[folder.id];
	var isSelected = state.selectedFolderId === folder.id;
	var chevron = isExpanded ? SVG_CHEVRON_DOWN : SVG_CHEVRON_RIGHT;
	var emoji = getFolderEmoji(folder);
	var folderIcon = emoji
		? '<span class="fnv-emoji-icon">' + escapeHtml(emoji) + '</span>'
		: (isExpanded ? SVG_FOLDER_OPEN : SVG_FOLDER);
	var badge = folder.note_count != null ? '<span class="fnv-badge">' + folder.note_count + '</span>' : '';
	var paddingLeft = 4 + depth * 16;

	var html = '<div class="fnv-tree-item fnv-folder' + (isSelected ? ' fnv-selected' : '') + '" data-id="' + folder.id + '" data-type="folder" style="padding-left:' + paddingLeft + 'px">';
	html += '<span class="fnv-chevron" data-id="' + folder.id + '">' + chevron + '</span>';
	html += '<span class="fnv-icon">' + folderIcon + '</span>';
	html += '<span class="fnv-title">' + escapeHtml(folder.title) + '</span>';
	html += badge;
	html += '</div>';

	if (isExpanded && state.folderChildren[folder.id]) {
		html += '<div class="fnv-children" data-parent="' + folder.id + '">';
		var children = state.folderChildren[folder.id];

		var childFolders = children.filter(function (c) { return c.type === 'folder'; });
		var childNotes = children.filter(function (c) { return c.type === 'note'; });

		childFolders = sortItems(childFolders, state.sortMode);
		childNotes = sortItems(childNotes, state.sortMode);

		for (var i = 0; i < childFolders.length; i++) {
			html += renderFolderNode(childFolders[i], depth + 1);
		}
		for (var j = 0; j < childNotes.length; j++) {
			html += renderNoteNode(childNotes[j], depth + 1);
		}

		if (childFolders.length === 0 && childNotes.length === 0) {
			html += '<div class="fnv-empty" style="padding-left:' + (paddingLeft + 20) + 'px">(empty)</div>';
		}
		html += '</div>';
	}

	return html;
}

function renderNoteNode(note, depth) {
	var isActive = state.selectedNoteId === note.id;
	var icon = getNoteIcon(note);
	var paddingLeft = 4 + depth * 16 + 20;

	var cls = 'fnv-tree-item fnv-note';
	if (isActive) cls += ' fnv-active-note';

	var html = '<div class="' + cls + '" data-id="' + note.id + '" data-type="note" style="padding-left:' + paddingLeft + 'px">';
	html += '<span class="fnv-icon">' + icon + '</span>';
	html += '<span class="fnv-title">' + escapeHtml(note.title || 'Untitled') + '</span>';
	html += '</div>';

	return html;
}

function renderTree() {
	var container = document.getElementById('fnv-tree');
	if (!container) return;
	if (container.querySelector('.fnv-rename-input')) return;

	if (state.isSearchMode) {
		renderSearchResults(container);
		return;
	}

	var html = '';
	var sortedTree = sortItems(state.tree, state.sortMode);

	for (var i = 0; i < sortedTree.length; i++) {
		html += renderFolderNode(sortedTree[i], 0);
	}

	if (html === '') {
		html = '<div class="fnv-empty-state">No notebooks found</div>';
	}

	container.innerHTML = html;
	attachTreeEvents();
}

function renderSearchResults(container) {
	if (!state.searchResults || state.searchResults.length === 0) {
		container.innerHTML = '<div class="fnv-empty-state">No results found</div>';
		attachTreeEvents();
		return;
	}

	var html = '<div class="fnv-search-results">';
	var sorted = sortItems(state.searchResults, state.sortMode);

	for (var i = 0; i < sorted.length; i++) {
		var item = sorted[i];
		var isSelected = item.type === 'note'
			? state.selectedNoteId === item.id
			: state.selectedFolderId === item.id;
		var icon;
		if (item.type === 'folder') {
			var emoji = getFolderEmoji(item);
			icon = emoji
				? '<span class="fnv-emoji-icon">' + escapeHtml(emoji) + '</span>'
				: SVG_FOLDER;
		} else {
			icon = getNoteIcon(item);
		}
		var typeClass = item.type === 'folder' ? ' fnv-folder' : ' fnv-note';

		html += '<div class="fnv-tree-item' + typeClass + (isSelected ? ' fnv-selected' : '') + '" data-id="' + item.id + '" data-type="' + item.type + '" style="padding-left:8px">';
		html += '<span class="fnv-icon">' + icon + '</span>';
		html += '<span class="fnv-title">' + escapeHtml(item.title || 'Untitled') + '</span>';
		if (item.type === 'folder') {
			html += '<span class="fnv-search-type-tag">notebook</span>';
		}
		html += '</div>';
	}
	html += '</div>';

	container.innerHTML = html;
	attachTreeEvents();
}

function attachTreeEvents() {
	var chevrons = document.querySelectorAll('.fnv-chevron');
	for (var i = 0; i < chevrons.length; i++) {
		chevrons[i].addEventListener('click', handleChevronClick);
	}

	var items = document.querySelectorAll('.fnv-tree-item');
	for (var j = 0; j < items.length; j++) {
		items[j].addEventListener('click', handleItemClick);
		items[j].addEventListener('contextmenu', handleContextMenu);
	}
}

function handleChevronClick(e) {
	e.stopPropagation();
	var folderId = e.currentTarget.getAttribute('data-id');
	toggleFolder(folderId);
}

function handleItemClick(e) {
	var el = e.currentTarget;
	var id = el.getAttribute('data-id');
	var type = el.getAttribute('data-type');

	if (type === 'note') {
		webviewApi.postMessage({ type: 'openNote', noteId: id });
		if (state.isSearchMode) {
			state.isSearchMode = false;
			state.searchResults = [];
			state.searchQuery = '';
			state.selectedNoteId = id;
			var searchInput = document.getElementById('fnv-search');
			if (searchInput) searchInput.value = '';
			expandToNote(id);
		}
	} else if (type === 'folder') {
		state.selectedFolderId = id;
		if (state.isSearchMode) {
			state.isSearchMode = false;
			state.searchResults = [];
			state.searchQuery = '';
			var searchInput2 = document.getElementById('fnv-search');
			if (searchInput2) searchInput2.value = '';
			expandToFolder(id);
		} else {
			toggleFolder(id);
		}
	}
}

async function toggleFolder(folderId) {
	if (state.expandedFolders[folderId]) {
		delete state.expandedFolders[folderId];
		renderTree();
		return;
	}

	state.expandedFolders[folderId] = true;

	if (!state.folderChildren[folderId]) {
		var result = await webviewApi.postMessage({ type: 'expandFolder', folderId: folderId });
		if (result) {
			var children = [];

			if (result.folders) {
				for (var i = 0; i < result.folders.length; i++) {
					var f = result.folders[i];
					children.push({
						id: f.id,
						title: f.title,
						type: 'folder',
						parent_id: f.parent_id,
						icon: f.icon,
						note_count: f.note_count,
					});
				}
			}

			if (result.notes) {
				for (var j = 0; j < result.notes.length; j++) {
					var n = result.notes[j];
					children.push({
						id: n.id,
						title: n.title,
						type: 'note',
						parent_id: n.parent_id,
						is_todo: n.is_todo,
						todo_completed: n.todo_completed,
						updated_time: n.updated_time,
					});
				}
			}

			state.folderChildren[folderId] = children;
		}
	}

	renderTree();
}

var searchDebounce = null;

function setupToolbar() {
	var searchInput = document.getElementById('fnv-search');
	if (searchInput) {
		searchInput.addEventListener('input', function (e) {
			clearTimeout(searchDebounce);
			var query = e.target.value;
			searchDebounce = setTimeout(function () {
				handleSearch(query);
			}, 300);
		});
	}

	var sortSelect = document.getElementById('fnv-sort');
	if (sortSelect) {
		sortSelect.addEventListener('change', function (e) {
			state.sortMode = e.target.value;
			state.folderChildren = {};
			Object.keys(state.expandedFolders).forEach(function(folderId) {
				delete state.expandedFolders[folderId];
			});
			renderTree();
		});
	}

	var newNoteBtn = document.getElementById('fnv-new-note');
	if (newNoteBtn) {
		newNoteBtn.addEventListener('click', function () {
			webviewApi.postMessage({
				type: 'createNote',
				folderId: state.selectedFolderId,
			}).then(function (result) {
				if (result && result.note) addNoteToFolderCache(result.note);
			});
		});
	}

	var filterToggle = document.getElementById('fnv-filter-toggle');
	if (filterToggle) {
		filterToggle.addEventListener('click', function () {
			state.filterPanelOpen = !state.filterPanelOpen;
			var panel = document.getElementById('fnv-filter-panel');
			if (panel) {
				panel.className = state.filterPanelOpen ? '' : 'fnv-filter-hidden';
			}
			filterToggle.classList.toggle('fnv-active', state.filterPanelOpen);
		});
	}

	var filterNotes = document.getElementById('fnv-filter-notes');
	var filterNotebooks = document.getElementById('fnv-filter-notebooks');
	var filterDateAfter = document.getElementById('fnv-filter-date-after');
	var filterDateBefore = document.getElementById('fnv-filter-date-before');

	if (filterNotes) filterNotes.addEventListener('change', function () { state.filters.includeNotes = this.checked; rerunSearch(); });
	if (filterNotebooks) filterNotebooks.addEventListener('change', function () { state.filters.includeNotebooks = this.checked; rerunSearch(); });
	if (filterDateAfter) filterDateAfter.addEventListener('change', function () { state.filters.dateAfter = this.value ? new Date(this.value).getTime() : null; rerunSearch(); });
	if (filterDateBefore) filterDateBefore.addEventListener('change', function () { state.filters.dateBefore = this.value ? new Date(this.value + 'T23:59:59').getTime() : null; rerunSearch(); });

	var manageExclusions = document.getElementById('fnv-manage-exclusions');
	if (manageExclusions) {
		manageExclusions.addEventListener('click', function () {
			var panel = document.getElementById('fnv-exclusion-panel');
			if (panel) {
				var isHidden = panel.classList.contains('fnv-filter-hidden');
				panel.className = isHidden ? '' : 'fnv-filter-hidden';
				if (isHidden) loadExclusions();
			}
		});
	}

	setupSearchHistory();
}

async function handleSearch(query) {
	state.searchQuery = query;

	if (!query || query.trim().length === 0) {
		state.isSearchMode = false;
		state.searchResults = [];
		renderTree();
		return;
	}

	state.isSearchMode = true;
	addSearchHistory(query);
	var result = await webviewApi.postMessage({
		type: 'search',
		query: query,
		filters: {
			includeNotes: state.filters.includeNotes,
			includeNotebooks: state.filters.includeNotebooks,
			dateAfter: state.filters.dateAfter,
			dateBefore: state.filters.dateBefore,
		},
	});

	if (result && result.type === 'search') {
		state.searchResults = result.results;
	} else if (result && result.type === 'tree') {
		state.isSearchMode = false;
		state.tree = result.tree;
	}
	renderTree();
}

function rerunSearch() {
	if (state.isSearchMode && state.searchQuery) {
		handleSearch(state.searchQuery);
	}
}

async function loadExclusions() {
	var result = await webviewApi.postMessage({ type: 'getExclusions' });
	if (!result) return;
	state.excludedFolderIds = result.excludedFolderIds || [];
	state.excludedNoteIds = result.excludedNoteIds || [];
	renderExclusionList(result.folderNames || {}, result.noteNames || {});
}

function renderExclusionList(folderNames, noteNames) {
	var container = document.getElementById('fnv-exclusion-list');
	if (!container) return;
	var html = '';
	if (state.excludedFolderIds.length === 0 && state.excludedNoteIds.length === 0) {
		html = '<div class="fnv-exclusion-empty">No exclusions configured.</div>';
	} else {
		for (var i = 0; i < state.excludedFolderIds.length; i++) {
			var fid = state.excludedFolderIds[i];
			var fname = folderNames[fid] || fid;
			html += '<div class="fnv-exclusion-item" data-id="' + fid + '" data-item-type="folder">';
			html += '<span class="fnv-exclusion-type">NB</span>';
			html += '<span class="fnv-exclusion-name">' + escapeHtml(fname) + '</span>';
			html += '<span class="fnv-exclusion-remove" data-id="' + fid + '" data-item-type="folder">×</span>';
			html += '</div>';
		}
		for (var j = 0; j < state.excludedNoteIds.length; j++) {
			var nid = state.excludedNoteIds[j];
			var nname = noteNames[nid] || nid;
			html += '<div class="fnv-exclusion-item" data-id="' + nid + '" data-item-type="note">';
			html += '<span class="fnv-exclusion-type">N</span>';
			html += '<span class="fnv-exclusion-name">' + escapeHtml(nname) + '</span>';
			html += '<span class="fnv-exclusion-remove" data-id="' + nid + '" data-item-type="note">×</span>';
			html += '</div>';
		}
	}
	container.innerHTML = html;
	var removes = container.querySelectorAll('.fnv-exclusion-remove');
	for (var k = 0; k < removes.length; k++) {
		removes[k].addEventListener('click', function (e) {
			var id = e.currentTarget.getAttribute('data-id');
			var itemType = e.currentTarget.getAttribute('data-item-type');
			webviewApi.postMessage({ type: 'removeExclusion', itemId: id, itemType: itemType }).then(function () {
				loadExclusions();
				refreshTreeAfterExclusion();
			});
		});
	}
}

function setupSearchHistory() {
	var searchInput = document.getElementById('fnv-search');
	if (!searchInput) return;
	try {
		state.searchHistory = JSON.parse(localStorage.getItem('fnv-search-history') || '[]');
	} catch (e) { state.searchHistory = []; }

	searchInput.addEventListener('focus', function () {
		if (state.searchHistory.length > 0) {
			state.searchHistoryShowAll = false;
			showSearchHistoryDropdown();
		}
	});

	searchInput.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			dismissSearchHistory();
			searchInput.blur();
		}
	});

	document.addEventListener('mousedown', function (e) {
		var dropdown = document.getElementById('fnv-search-history');
		if (!dropdown) return;
		var searchWrap = document.getElementById('fnv-search-wrap');
		if (searchWrap && !searchWrap.contains(e.target)) {
			dismissSearchHistory();
		}
	});
}

function dismissSearchHistory() {
	var dropdown = document.getElementById('fnv-search-history');
	if (dropdown) dropdown.remove();
	state.searchHistoryOpen = false;
}

function addSearchHistory(query) {
	if (!query || !query.trim()) return;
	state.searchHistory = state.searchHistory.filter(function (h) { return h !== query; });
	state.searchHistory.unshift(query);
	if (state.searchHistory.length > 100) state.searchHistory = state.searchHistory.slice(0, 100);
	try { localStorage.setItem('fnv-search-history', JSON.stringify(state.searchHistory)); } catch (e) {}
}

function showSearchHistoryDropdown() {
	var existing = document.getElementById('fnv-search-history');
	if (existing) existing.remove();

	var wrap = document.getElementById('fnv-search-wrap');
	if (!wrap || state.searchHistory.length === 0) return;

	var limit = state.searchHistoryShowAll ? Math.min(state.searchHistory.length, 50) : 5;
	var items = state.searchHistory.slice(0, limit);

	var dropdown = document.createElement('div');
	dropdown.id = 'fnv-search-history';
	dropdown.className = 'fnv-search-history-dropdown';

	var html = '';
	for (var i = 0; i < items.length; i++) {
		html += '<div class="fnv-search-history-item" data-query="' + escapeHtml(items[i]) + '">' + escapeHtml(items[i]) + '</div>';
	}
	if (!state.searchHistoryShowAll && state.searchHistory.length > 5) {
		html += '<div class="fnv-search-history-more" id="fnv-search-history-more">Show more...</div>';
	}
	html += '<div class="fnv-search-history-clear" id="fnv-search-history-clear">Clear all</div>';
	dropdown.innerHTML = html;

	wrap.appendChild(dropdown);
	state.searchHistoryOpen = true;

	var histItems = dropdown.querySelectorAll('.fnv-search-history-item');
	for (var j = 0; j < histItems.length; j++) {
		histItems[j].addEventListener('click', function (e) {
			var q = e.currentTarget.getAttribute('data-query');
			var input = document.getElementById('fnv-search');
			if (input) { input.value = q; handleSearch(q); }
			dropdown.remove();
			state.searchHistoryOpen = false;
		});
	}

	var moreBtn = document.getElementById('fnv-search-history-more');
	if (moreBtn) {
		moreBtn.addEventListener('click', function () {
			state.searchHistoryShowAll = true;
			showSearchHistoryDropdown();
		});
	}

	var clearBtn = document.getElementById('fnv-search-history-clear');
	if (clearBtn) {
		clearBtn.addEventListener('click', function () {
			state.searchHistory = [];
			try { localStorage.removeItem('fnv-search-history'); } catch (e) {}
			dropdown.remove();
			state.searchHistoryOpen = false;
		});
	}
}

function updateNoteCountBadges(tree) {
	for (var i = 0; i < tree.length; i++) {
		var folder = tree[i];
		if (folder.note_count == null) {
			webviewApi.postMessage({ type: 'getNoteCount', folderId: folder.id }).then(function (f) {
				return function (result) {
					if (result && result.count != null) {
						f.note_count = result.count;
						var badge = document.querySelector('.fnv-folder[data-id="' + f.id + '"] .fnv-badge');
						if (!badge) {
							var item = document.querySelector('.fnv-folder[data-id="' + f.id + '"]');
							if (item) {
								var span = document.createElement('span');
								span.className = 'fnv-badge';
								span.textContent = result.count;
								item.appendChild(span);
							}
						} else {
							badge.textContent = result.count;
						}
					}
				};
			}(folder));
		}
	}
}

function setupTabs() {
	var tabs = document.querySelectorAll('.fnv-tab');
	for (var i = 0; i < tabs.length; i++) {
		tabs[i].addEventListener('click', handleTabClick);
	}
}

function setupSyncBar() {
	var syncBtn = document.getElementById('fnv-sync-btn');
	if (syncBtn) {
		syncBtn.addEventListener('click', function () {
			if (state.syncStatus === 'syncing') return;
			webviewApi.postMessage({ type: 'startSync' });
		});
	}

	var logToggle = document.getElementById('fnv-sync-log-toggle');
	if (logToggle) {
		logToggle.addEventListener('click', function () {
			state.syncLogOpen = !state.syncLogOpen;
			var logEl = document.getElementById('fnv-sync-log');
			if (logEl) {
				logEl.className = state.syncLogOpen ? '' : 'fnv-sync-log-hidden';
			}
			logToggle.classList.toggle('fnv-log-open', state.syncLogOpen);
		});
	}
}

function updateSyncUI(status, message) {
	state.syncStatus = status;
	var icon = document.getElementById('fnv-sync-icon');
	var text = document.getElementById('fnv-sync-text');
	var statusEl = document.getElementById('fnv-sync-status');
	var bar = document.getElementById('fnv-sync-bar');

	if (bar) {
		bar.className = status === 'syncing' ? 'fnv-syncing' : '';
	}
	if (icon) {
		icon.classList.toggle('fnv-spin', status === 'syncing');
	}
	if (text) {
		var labels = { idle: 'Sync', syncing: 'Syncing...', error: 'Sync Error' };
		text.textContent = labels[status] || 'Sync';
	}
	if (statusEl && message) {
		statusEl.textContent = message;
	}

	if (message) {
		addSyncLog(message);
	}
}

function addSyncLog(message) {
	state.syncLogs.push({ time: new Date(), text: message });
	if (state.syncLogs.length > 50) state.syncLogs.shift();

	var logEl = document.getElementById('fnv-sync-log');
	if (!logEl) return;

	var html = '';
	for (var i = state.syncLogs.length - 1; i >= 0; i--) {
		var entry = state.syncLogs[i];
		var timeStr = entry.time.toLocaleTimeString();
		html += '<div class="fnv-sync-log-entry"><span class="fnv-sync-log-time">' + timeStr + '</span> ' + escapeHtml(entry.text) + '</div>';
	}
	logEl.innerHTML = html;
}

function handleTabClick(e) {
	var tab = e.currentTarget;
	var tabName = tab.getAttribute('data-tab');
	if (tabName === state.activeTab) return;
	switchTab(tabName);
}

function switchTab(tabName) {
	state.activeTab = tabName;

	var tabs = document.querySelectorAll('.fnv-tab');
	for (var i = 0; i < tabs.length; i++) {
		var t = tabs[i];
		if (t.getAttribute('data-tab') === tabName) {
			t.classList.add('fnv-tab-active');
		} else {
			t.classList.remove('fnv-tab-active');
		}
	}

	var views = document.querySelectorAll('.fnv-view');
	for (var j = 0; j < views.length; j++) {
		views[j].classList.remove('fnv-view-active');
	}

	var activeView = document.getElementById('fnv-view-' + tabName);
	if (activeView) {
		activeView.classList.add('fnv-view-active');
	}

	if (tabName === 'toc' && state.tocHeadings.length === 0) {
		loadToc();
	}
}

var tocDebounce = null;

async function loadToc() {
	var result = await webviewApi.postMessage({ type: 'getHeadings' });
	if (result) {
		state.tocHeadings = result.headings || [];
		state.tocNoteTitle = result.noteTitle || '';
		renderToc();
	}
}

function renderToc() {
	var container = document.getElementById('fnv-toc');
	if (!container) return;

	if (!state.tocHeadings || state.tocHeadings.length === 0) {
		container.innerHTML = '<div class="fnv-toc-empty">No headings found</div>';
		return;
	}

	var html = '';
	if (state.tocNoteTitle) {
		html += '<div class="fnv-toc-title">' + escapeHtml(state.tocNoteTitle) + '</div>';
	}

	html += '<div class="fnv-toc-list">';
	for (var i = 0; i < state.tocHeadings.length; i++) {
		var h = state.tocHeadings[i];
		var indent = (h.level - 1) * 12;
		html += '<a class="fnv-toc-item fnv-toc-h' + h.level + '" data-slug="' + escapeHtml(h.slug) + '" href="#" style="padding-left:' + indent + 'px">';
		html += '<span class="fnv-toc-bullet">›</span>';
		html += '<span class="fnv-toc-text">' + escapeHtml(h.text) + '</span>';
		html += '</a>';
	}
	html += '</div>';

	container.innerHTML = html;
	attachTocEvents();
}

function attachTocEvents() {
	var items = document.querySelectorAll('.fnv-toc-item');
	for (var i = 0; i < items.length; i++) {
		items[i].addEventListener('click', handleTocClick);
	}
}

function handleTocClick(e) {
	e.preventDefault();
	var slug = e.currentTarget.getAttribute('data-slug');
	if (slug) {
		var items = document.querySelectorAll('.fnv-toc-item');
		for (var i = 0; i < items.length; i++) {
			items[i].classList.remove('fnv-toc-active');
		}
		e.currentTarget.classList.add('fnv-toc-active');

		webviewApi.postMessage({ type: 'scrollToHash', hash: slug });
	}
}

async function expandToNote(noteId) {
	var result = await webviewApi.postMessage({ type: 'getNotePath', noteId: noteId });
	if (!result || !result.path || result.path.length === 0) {
		renderTree();
		return;
	}
	var chain = result.path;
	for (var i = 0; i < chain.length; i++) {
		var folderId = chain[i];
		if (!state.expandedFolders[folderId]) {
			state.expandedFolders[folderId] = true;
			if (!state.folderChildren[folderId]) {
				var expandResult = await webviewApi.postMessage({ type: 'expandFolder', folderId: folderId });
				if (expandResult) {
					var children = [];
					if (expandResult.folders) {
						for (var fi = 0; fi < expandResult.folders.length; fi++) {
							var f = expandResult.folders[fi];
							children.push({ id: f.id, title: f.title, type: 'folder', parent_id: f.parent_id, icon: f.icon, note_count: f.note_count });
						}
					}
					if (expandResult.notes) {
						for (var ni = 0; ni < expandResult.notes.length; ni++) {
							var n = expandResult.notes[ni];
							children.push({ id: n.id, title: n.title, type: 'note', parent_id: n.parent_id, is_todo: n.is_todo, todo_completed: n.todo_completed, updated_time: n.updated_time });
						}
					}
					state.folderChildren[folderId] = children;
				}
			}
		}
	}
	renderTree();
	setTimeout(function () {
		var activeEl = document.querySelector('.fnv-active-note');
		if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}, 50);
}

async function expandToFolder(folderId) {
	var result = await webviewApi.postMessage({ type: 'getFolderPath', folderId: folderId });
	if (!result || !result.path || result.path.length === 0) {
		renderTree();
		return;
	}
	var chain = result.path;
	for (var i = 0; i < chain.length; i++) {
		var ancestorId = chain[i];
		if (!state.expandedFolders[ancestorId]) {
			state.expandedFolders[ancestorId] = true;
			if (!state.folderChildren[ancestorId]) {
				var expandResult = await webviewApi.postMessage({ type: 'expandFolder', folderId: ancestorId });
				if (expandResult) {
					var children = [];
					if (expandResult.folders) {
						for (var fi = 0; fi < expandResult.folders.length; fi++) {
							var f = expandResult.folders[fi];
							children.push({ id: f.id, title: f.title, type: 'folder', parent_id: f.parent_id, icon: f.icon, note_count: f.note_count });
						}
					}
					if (expandResult.notes) {
						for (var ni = 0; ni < expandResult.notes.length; ni++) {
							var n = expandResult.notes[ni];
							children.push({ id: n.id, title: n.title, type: 'note', parent_id: n.parent_id, is_todo: n.is_todo, todo_completed: n.todo_completed, updated_time: n.updated_time });
						}
					}
					state.folderChildren[ancestorId] = children;
				}
			}
		}
	}
	renderTree();
	setTimeout(function () {
		var targetEl = document.querySelector('.fnv-folder[data-id="' + folderId + '"]');
		if (targetEl) {
			targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			targetEl.classList.add('fnv-folder-flash');
			targetEl.addEventListener('animationend', function () {
				targetEl.classList.remove('fnv-folder-flash');
			}, { once: true });
		}
	}, 50);
}

function dismissContextMenu() {
	var existing = document.querySelector('.fnv-context-menu');
	if (existing) existing.remove();
}

function handleContextMenu(e) {
	e.preventDefault();
	e.stopPropagation();
	dismissContextMenu();

	var el = e.currentTarget;
	var id = el.getAttribute('data-id');
	var type = el.getAttribute('data-type');

	if (type === 'note') {
		showNoteContextMenu(e.clientX, e.clientY, id, el);
	} else if (type === 'folder') {
		showFolderContextMenu(e.clientX, e.clientY, id, el);
	}
}

function createContextMenu(x, y, items) {
	var menu = document.createElement('div');
	menu.className = 'fnv-context-menu';

	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		if (item.separator) {
			var sep = document.createElement('div');
			sep.className = 'fnv-context-menu-separator';
			menu.appendChild(sep);
			continue;
		}
		var el = document.createElement('div');
		el.className = 'fnv-context-menu-item';
		if (item.danger) el.classList.add('fnv-context-danger');
		if (item.icon) {
			el.innerHTML = item.icon + ' ' + escapeHtml(item.label);
		} else {
			el.textContent = item.label;
		}
		el.addEventListener('click', (function (action) {
			return function () {
				dismissContextMenu();
				action();
			};
		})(item.action));
		menu.appendChild(el);
	}

	document.body.appendChild(menu);

	var rect = menu.getBoundingClientRect();
	var winW = window.innerWidth;
	var winH = window.innerHeight;
	if (x + rect.width > winW) x = winW - rect.width - 4;
	if (y + rect.height > winH) y = winH - rect.height - 4;
	if (x < 0) x = 4;
	if (y < 0) y = 4;
	menu.style.left = x + 'px';
	menu.style.top = y + 'px';

	function onEscKey(e) {
		if (e.key === 'Escape') {
			dismissContextMenu();
			document.removeEventListener('keydown', onEscKey);
		}
	}
	document.addEventListener('keydown', onEscKey);

	setTimeout(function () {
		document.addEventListener('mousedown', function onClickAway(e) {
			if (!menu.contains(e.target)) {
				dismissContextMenu();
				document.removeEventListener('mousedown', onClickAway);
				document.removeEventListener('keydown', onEscKey);
			}
		});
	}, 0);
}

function showNoteContextMenu(x, y, noteId, el) {
	var noteTitle = '';
	var titleEl = el.querySelector('.fnv-title');
	if (titleEl) noteTitle = titleEl.textContent;

	var items = [
		{ label: 'Open', action: function () { webviewApi.postMessage({ type: 'openNote', noteId: noteId }); } },
		{ label: 'Open in New Window', action: function () { webviewApi.postMessage({ type: 'openNoteInNewWindow', noteId: noteId }); } },
		{ separator: true },
		{ label: 'New Note', action: function () {
			webviewApi.postMessage({ type: 'createNote', folderId: state.selectedFolderId }).then(function (result) {
				if (result && result.note) addNoteToFolderCache(result.note);
			});
		}},
		{ label: 'New Notebook', action: function () { webviewApi.postMessage({ type: 'newSubNotebook', parentId: state.selectedFolderId }); } },
		{ separator: true },
		{ label: 'Rename', action: function () { startInlineRename(el, noteId, 'note', noteTitle); } },
		{ label: 'Create Copy', action: function () { webviewApi.postMessage({ type: 'duplicateNote', noteId: noteId }); } },
		{ label: 'Copy Markdown Link', action: function () {
			webviewApi.postMessage({ type: 'copyMarkdownLink', noteId: noteId, noteTitle: noteTitle }).then(function (result) {
				if (result && result.clipboardText) {
					navigator.clipboard.writeText(result.clipboardText).catch(function () {
						var ta = document.createElement('textarea');
						ta.value = result.clipboardText;
						ta.style.position = 'fixed';
						ta.style.opacity = '0';
						document.body.appendChild(ta);
						ta.select();
						document.execCommand('copy');
						document.body.removeChild(ta);
					});
				}
			});
		}},
		{ separator: true },
		{ label: 'Move to Notebook', action: function () { webviewApi.postMessage({ type: 'moveToFolder', itemId: noteId }); } },
		{ label: 'Export', action: function () { webviewApi.postMessage({ type: 'exportNote', noteId: noteId }); } },
		{ separator: true },
		{ label: 'Properties', action: function () { webviewApi.postMessage({ type: 'showNoteProperties', noteId: noteId }); } },
		{ label: 'Publish', action: function () { webviewApi.postMessage({ type: 'publishNote', noteId: noteId }); } },
		{ separator: true },
		{ label: 'Delete', danger: true, action: function () { showDeleteNoteDialog(noteId, noteTitle); } },
	];

	createContextMenu(x, y, items);
}

function showFolderContextMenu(x, y, folderId, el) {
	var folderTitle = '';
	var titleEl = el.querySelector('.fnv-title');
	if (titleEl) folderTitle = titleEl.textContent;

	var items = [
		{ label: 'New Note', action: function () {
			webviewApi.postMessage({ type: 'createNote', folderId: folderId }).then(function (result) {
				if (result && result.note) addNoteToFolderCache(result.note);
			});
		}},
		{ label: 'New Notebook', action: function () { webviewApi.postMessage({ type: 'newSubNotebook', parentId: folderId }); } },
		{ separator: true },
		{ label: 'Rename', action: function () { startInlineRename(el, folderId, 'folder', folderTitle); } },
		{ label: 'Move to Notebook', action: function () { webviewApi.postMessage({ type: 'moveToFolder', itemId: folderId }); } },
		{ label: 'Export', action: function () { webviewApi.postMessage({ type: 'exportFolder', folderId: folderId }); } },
		{ separator: true },
		{ label: 'Delete Notebook', danger: true, action: function () { showDeleteFolderDialog(folderId, folderTitle); } },
	];

	createContextMenu(x, y, items);
}

function startInlineRename(el, id, itemType, currentTitle) {
	var titleEl = el.querySelector('.fnv-title');
	if (!titleEl) return;

	var input = document.createElement('input');
	input.type = 'text';
	input.className = 'fnv-rename-input';
	input.value = currentTitle;

	var originalHtml = titleEl.innerHTML;
	titleEl.innerHTML = '';
	titleEl.appendChild(input);
	input.focus();
	input.select();

	var finished = false;

	function commitRename() {
		if (finished) return;
		finished = true;
		var newTitle = input.value.trim();
		if (newTitle && newTitle !== currentTitle) {
			webviewApi.postMessage({ type: 'renameItem', itemId: id, itemType: itemType, newTitle: newTitle }).then(function () {
				titleEl.textContent = newTitle;
				if (state.folderChildren) {
					Object.keys(state.folderChildren).forEach(function (fid) {
						state.folderChildren[fid].forEach(function (child) {
							if (child.id === id) child.title = newTitle;
						});
					});
				}
			});
		} else {
			titleEl.innerHTML = originalHtml;
		}
	}

	function cancelRename() {
		if (finished) return;
		finished = true;
		titleEl.innerHTML = originalHtml;
	}

	input.addEventListener('click', function (e) {
		e.stopPropagation();
	});

	input.addEventListener('keydown', function (e) {
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			commitRename();
		} else if (e.key === 'Escape') {
			cancelRename();
		}
	});
}

function addNoteToFolderCache(note) {
	var folderId = note.parent_id;
	if (!folderId) return;
	if (state.folderChildren[folderId]) {
		var exists = state.folderChildren[folderId].some(function (c) { return c.id === note.id; });
		if (!exists) {
			state.folderChildren[folderId].push({
				id: note.id,
				title: note.title || 'Untitled',
				type: 'note',
				parent_id: note.parent_id,
				is_todo: note.is_todo || 0,
				todo_completed: note.todo_completed || 0,
				updated_time: note.updated_time || Date.now(),
			});
		}
	}
	if (!state.expandedFolders[folderId]) {
		state.expandedFolders[folderId] = true;
	}
	renderTree();
}

function removeNoteFromFolderCache(noteId) {
	Object.keys(state.folderChildren).forEach(function (fid) {
		state.folderChildren[fid] = state.folderChildren[fid].filter(function (c) {
			return c.id !== noteId;
		});
	});
	renderTree();
}

function showDeleteNoteDialog(noteId, noteTitle) {
	var overlay = document.createElement('div');
	overlay.className = 'fnv-dialog-overlay';

	var dialog = document.createElement('div');
	dialog.className = 'fnv-dialog';

	dialog.innerHTML =
		'<div class="fnv-dialog-title">Delete Note</div>' +
		'<div class="fnv-dialog-text">Are you sure you want to delete <strong>' + escapeHtml(noteTitle) + '</strong>?</div>' +
		'<div class="fnv-dialog-buttons">' +
		'<button class="fnv-dialog-btn fnv-dialog-btn-cancel">Cancel</button>' +
		'<button class="fnv-dialog-btn fnv-dialog-btn-danger fnv-dialog-btn-enabled">Delete</button>' +
		'</div>';

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	var deleteBtn = dialog.querySelector('.fnv-dialog-btn-danger');
	var cancelBtn = dialog.querySelector('.fnv-dialog-btn-cancel');

	deleteBtn.addEventListener('click', function () {
		webviewApi.postMessage({ type: 'deleteNote', noteId: noteId }).then(function () {
			overlay.remove();
			removeNoteFromFolderCache(noteId);
		});
	});

	cancelBtn.addEventListener('click', function () { overlay.remove(); });
	overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
	dialog.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') overlay.remove();
	});
	deleteBtn.focus();
}

function showDeleteFolderDialog(folderId, folderTitle) {
	var overlay = document.createElement('div');
	overlay.className = 'fnv-dialog-overlay';

	var dialog = document.createElement('div');
	dialog.className = 'fnv-dialog';

	dialog.innerHTML =
		'<div class="fnv-dialog-title">Delete Notebook</div>' +
		'<div class="fnv-dialog-text">This will permanently delete <strong>' + escapeHtml(folderTitle) + '</strong> and all its contents. Type the notebook name to confirm:</div>' +
		'<input type="text" class="fnv-dialog-input" placeholder="' + escapeHtml(folderTitle) + '" />' +
		'<div class="fnv-dialog-buttons">' +
		'<button class="fnv-dialog-btn fnv-dialog-btn-cancel">Cancel</button>' +
		'<button class="fnv-dialog-btn fnv-dialog-btn-danger">Delete</button>' +
		'</div>';

	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	var input = dialog.querySelector('.fnv-dialog-input');
	var deleteBtn = dialog.querySelector('.fnv-dialog-btn-danger');
	var cancelBtn = dialog.querySelector('.fnv-dialog-btn-cancel');

	input.focus();

	input.addEventListener('input', function () {
		if (input.value === folderTitle) {
			deleteBtn.classList.add('fnv-dialog-btn-enabled');
		} else {
			deleteBtn.classList.remove('fnv-dialog-btn-enabled');
		}
	});

	deleteBtn.addEventListener('click', function () {
		if (input.value !== folderTitle) return;
		webviewApi.postMessage({ type: 'deleteFolder', folderId: folderId }).then(function () {
			overlay.remove();
			delete state.expandedFolders[folderId];
			delete state.folderChildren[folderId];
			Object.keys(state.folderChildren).forEach(function (fid) {
				state.folderChildren[fid] = state.folderChildren[fid].filter(function (c) {
					return c.id !== folderId;
				});
			});
			state.tree = state.tree.filter(function (f) { return f.id !== folderId; });
			renderTree();
			refreshTreeAfterExclusion();
		});
	});

	cancelBtn.addEventListener('click', function () { overlay.remove(); });
	overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

	input.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') overlay.remove();
		if (e.key === 'Enter' && input.value === folderTitle) {
			deleteBtn.click();
		}
	});
}

function refreshTreeAfterExclusion() {
	webviewApi.postMessage({ type: 'refreshTree' }).then(function (result) {
		if (result && result.tree) {
			state.tree = result.tree;
			state.folderChildren = {};
			var expandedIds = Object.keys(state.expandedFolders);
			if (expandedIds.length === 0) {
				renderTree();
				return;
			}
			var pending = expandedIds.length;
			expandedIds.forEach(function (folderId) {
				webviewApi.postMessage({ type: 'expandFolder', folderId: folderId }).then(function (expandResult) {
					if (expandResult) {
						var children = [];
						if (expandResult.folders) {
							for (var fi = 0; fi < expandResult.folders.length; fi++) {
								var f = expandResult.folders[fi];
								children.push({ id: f.id, title: f.title, type: 'folder', parent_id: f.parent_id, icon: f.icon, note_count: f.note_count });
							}
						}
						if (expandResult.notes) {
							for (var ni = 0; ni < expandResult.notes.length; ni++) {
								var n = expandResult.notes[ni];
								children.push({ id: n.id, title: n.title, type: 'note', parent_id: n.parent_id, is_todo: n.is_todo, todo_completed: n.todo_completed, updated_time: n.updated_time });
							}
						}
						state.folderChildren[folderId] = children;
					}
					pending--;
					if (pending === 0) renderTree();
				});
			});
		}
	});
}

webviewApi.onMessage(function (message) {
	if (message.message) message = message.message;

	switch (message.type) {
		case 'noteSelected':
			state.selectedNoteId = message.noteId;
			state.selectedFolderId = message.folderId || state.selectedFolderId;
			if (message.noteId && !state.isSearchMode) {
				expandToNote(message.noteId);
			} else {
				renderTree();
			}
			break;

		case 'treeRefreshed':
			state.tree = message.tree || [];
			renderTree();
			var expandedIds = Object.keys(state.expandedFolders);
			var pendingRefresh = expandedIds.length;
			if (pendingRefresh > 0) {
				expandedIds.forEach(function (folderId) {
					webviewApi.postMessage({ type: 'expandFolder', folderId: folderId }).then(function (result) {
						if (result) {
							var children = [];
							if (result.folders) {
								for (var fi = 0; fi < result.folders.length; fi++) {
									var f = result.folders[fi];
									children.push({ id: f.id, title: f.title, type: 'folder', parent_id: f.parent_id, icon: f.icon, note_count: f.note_count });
								}
							}
							if (result.notes) {
								for (var ni = 0; ni < result.notes.length; ni++) {
									var n = result.notes[ni];
									children.push({ id: n.id, title: n.title, type: 'note', parent_id: n.parent_id, is_todo: n.is_todo, todo_completed: n.todo_completed, updated_time: n.updated_time });
								}
							}
							state.folderChildren[folderId] = children;
						}
						pendingRefresh--;
						if (pendingRefresh === 0) renderTree();
					});
				});
			}
			break;

		case 'tocUpdated':
			state.tocHeadings = message.headings || [];
			state.tocNoteTitle = message.noteTitle || '';
			if (state.activeTab === 'toc') {
				renderToc();
			}
			break;

		case 'syncStarted':
			updateSyncUI('syncing', 'Sync started');
			break;

		case 'syncCompleted':
			var syncMsg = message.withErrors ? 'Sync completed with errors' : 'Sync completed';
			updateSyncUI(message.withErrors ? 'error' : 'idle', syncMsg);
			break;
	}
});

async function initialize() {
	setupToolbar();
	setupTabs();
	setupSyncBar();

	var result = await webviewApi.postMessage({ type: 'init' });
	if (result) {
		state.tree = result.tree || [];
		state.selectedNoteId = result.selectedNoteId;
		state.selectedFolderId = result.selectedFolderId;
		renderTree();
		updateNoteCountBadges(state.tree);
	}
}

document.addEventListener('DOMContentLoaded', function () {
	initialize();
});

if (document.readyState !== 'loading') {
	initialize();
}
