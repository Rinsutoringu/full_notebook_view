import joplin from 'api';
import { ToolbarButtonLocation, SettingItemType } from 'api/types';

interface FolderItem {
	id: string;
	title: string;
	parent_id: string;
	icon: string;
}

interface NoteItem {
	id: string;
	title: string;
	parent_id: string;
	is_todo: number;
	todo_completed: number;
	updated_time: number;
}

interface TreeNode {
	id: string;
	title: string;
	type: 'folder' | 'note';
	parent_id: string;
	children?: TreeNode[];
	is_todo?: number;
	todo_completed?: number;
	updated_time?: number;
	icon?: string;
	note_count?: number;
}

interface HeadingItem {
	level: number;
	text: string;
	slug: string;
	lineno: number;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af -]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function extractHeadings(body: string): HeadingItem[] {
	const headings: HeadingItem[] = [];
	const slugCounts: Record<string, number> = {};
	const lines = body.split('\n');

	let inCodeBlock = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trimStart().startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		const match = line.match(/^(#{1,6})\s+(.*)/);
		if (!match) continue;

		const level = match[1].length;
		const rawText = match[2].replace(/\*\*|__|~~|`|(\[([^\]]*)\]\([^)]*\))/g, (m, link, linkText) => linkText || m.replace(/\*\*|__|~~|`/g, ''));
		const text = rawText.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();

		let slug = slugify(text);
		if (!slug) slug = `heading-${i}`;
		const count = slugCounts[slug] || 0;
		slugCounts[slug] = count + 1;
		if (count > 0) slug = `${slug}-${count}`;

		headings.push({ level, text, slug, lineno: i });
	}
	return headings;
}

async function fetchAllFolders(): Promise<FolderItem[]> {
	const folders: FolderItem[] = [];
	let page = 1;

	while (true) {
		const result = await joplin.data.get(['folders'], {
			fields: ['id', 'title', 'parent_id', 'icon'],
			page: page,
			limit: 100,
		});
		folders.push(...result.items);
		if (!result.has_more) break;
		page++;
	}
	return folders;
}

async function fetchNotesInFolder(folderId: string): Promise<NoteItem[]> {
	const notes: NoteItem[] = [];
	let page = 1;

	while (true) {
		const result = await joplin.data.get(['folders', folderId, 'notes'], {
			fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time'],
			page: page,
			limit: 100,
		});
		notes.push(...result.items);
		if (!result.has_more) break;
		page++;
	}
	return notes;
}

async function searchNotes(query: string): Promise<NoteItem[]> {
	const notes: NoteItem[] = [];
	let page = 1;

	while (true) {
		const result = await joplin.data.get(['search'], {
			query: query,
			fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time'],
			page: page,
			limit: 50,
		});
		notes.push(...result.items);
		if (!result.has_more || page >= 5) break;
		page++;
	}
	return notes;
}

function buildFolderTree(folders: FolderItem[]): TreeNode[] {
	const map = new Map<string, TreeNode>();
	const roots: TreeNode[] = [];

	for (const f of folders) {
		map.set(f.id, {
			id: f.id,
			title: f.title,
			type: 'folder',
			parent_id: f.parent_id,
			children: [],
			icon: f.icon,
		});
	}

	for (const f of folders) {
		const node = map.get(f.id);
		if (!node) continue;

		if (f.parent_id && map.has(f.parent_id)) {
			map.get(f.parent_id).children.push(node);
		} else {
			roots.push(node);
		}
	}

	for (const node of map.values()) {
		node.children.sort((a, b) => a.title.localeCompare(b.title));
	}
	roots.sort((a, b) => a.title.localeCompare(b.title));

	return roots;
}

async function countNotesInFolder(folderId: string): Promise<number> {
	let count = 0;
	let page = 1;

	while (true) {
		const result = await joplin.data.get(['folders', folderId, 'notes'], {
			fields: ['id'],
			page: page,
			limit: 100,
		});
		count += result.items.length;
		if (!result.has_more) break;
		page++;
	}
	return count;
}

joplin.plugins.register({
	onStart: async function () {
		const panel = await joplin.views.panels.create('fullNotebookView.panel');

		await joplin.settings.registerSection('fullNotebookView', {
			label: 'Full Notebook View',
			iconName: 'fas fa-folder-tree',
		});

		await joplin.settings.registerSettings({
			'fullNotebookView.excludedFolderIds': {
				value: '[]',
				type: SettingItemType.String,
				section: 'fullNotebookView',
				public: false,
				label: 'Excluded folder IDs (JSON array)',
			},
			'fullNotebookView.excludedNoteIds': {
				value: '[]',
				type: SettingItemType.String,
				section: 'fullNotebookView',
				public: false,
				label: 'Excluded note IDs (JSON array)',
			},
			'fullNotebookView.hideTitleInput': {
				value: false,
				type: SettingItemType.Bool,
				section: 'fullNotebookView',
				public: true,
				label: 'Hide note title bar',
				description: 'Hide the title input field above the note editor.',
			},
		});

		await joplin.views.panels.setHtml(panel, `
			<div id="fnv-root">
				<div id="fnv-tabs">
					<button class="fnv-tab fnv-tab-active" data-tab="notebooks">
						<svg viewBox="0 0 16 16" width="13" height="13"><path fill="currentColor" d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/></svg>
						<span>Notebooks</span>
					</button>
					<button class="fnv-tab" data-tab="toc">
						<svg viewBox="0 0 16 16" width="13" height="13"><path fill="currentColor" d="M2 2h4v1H2V2zm0 3h4v1H2V5zm0 3h4v1H2V8zm0 3h10v1H2v-1zm6-9h6v1H8V2zm0 3h6v1H8V5zm0 3h6v1H8V8z"/></svg>
						<span>Outline</span>
					</button>
				</div>
				<div id="fnv-views">
					<div id="fnv-view-notebooks" class="fnv-view fnv-view-active">
						<div id="fnv-toolbar">
							<button id="fnv-new-note" title="New Note">
								<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 1a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2H9v5a1 1 0 1 1-2 0V9H2a1 1 0 0 1 0-2h5V2a1 1 0 0 1 1-1z"/></svg>
							</button>
							<div id="fnv-search-wrap">
								<input type="text" id="fnv-search" placeholder="Search notes..." />
							</div>
							<select id="fnv-sort">
								<option value="title-asc">Name ↑</option>
								<option value="title-desc">Name ↓</option>
								<option value="date-desc">Date ↓</option>
								<option value="date-asc">Date ↑</option>
							</select>
							<button id="fnv-filter-toggle" title="Filters">
								<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 .8 1.6L10 9.267V13a1 1 0 0 1-.553.894l-2 1A1 1 0 0 1 6 14V9.267L1.2 2.6A1 1 0 0 1 1 2z"/></svg>
							</button>
						</div>
						<div id="fnv-filter-panel" class="fnv-filter-hidden">
							<div class="fnv-filter-row">
								<label class="fnv-filter-label"><input type="checkbox" id="fnv-filter-notes" checked /> Notes</label>
								<label class="fnv-filter-label"><input type="checkbox" id="fnv-filter-notebooks" checked /> Notebooks</label>
							</div>
							<div class="fnv-filter-row">
								<label class="fnv-filter-label fnv-filter-date-label">After <input type="date" id="fnv-filter-date-after" /></label>
								<label class="fnv-filter-label fnv-filter-date-label">Before <input type="date" id="fnv-filter-date-before" /></label>
							</div>
							<div class="fnv-filter-row">
								<span class="fnv-filter-exclusion-link" id="fnv-manage-exclusions">Manage exclusions...</span>
							</div>
							<div id="fnv-exclusion-panel" class="fnv-filter-hidden">
								<div id="fnv-exclusion-list"></div>
							</div>
						</div>
						<div id="fnv-tree"></div>
					</div>
					<div id="fnv-view-toc" class="fnv-view">
						<div id="fnv-toc"></div>
					</div>
				</div>
				<div id="fnv-sync-bar">
					<button id="fnv-sync-btn" title="Synchronize">
						<svg id="fnv-sync-icon" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
						<span id="fnv-sync-text">Sync</span>
					</button>
					<div id="fnv-sync-status"></div>
					<div id="fnv-sync-log-toggle" title="Toggle sync log">
						<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M12.78 6.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 1.06-1.06L8 9.94l3.72-3.72a.75.75 0 0 1 1.06 0z"/></svg>
					</div>
				</div>
				<div id="fnv-sync-log" class="fnv-sync-log-hidden"></div>
			</div>
		`);

		await joplin.views.panels.addScript(panel, './webview.js');
		await joplin.views.panels.addScript(panel, './webview.css');

		const installDir: string = await (joplin.plugins as any).installationDir();

		async function applyTitleInputCss() {
			try {
				const hide: boolean = await joplin.settings.value('fullNotebookView.hideTitleInput');
				const cssFile = hide ? 'title-input-hide.css' : 'title-input-show.css';
				await (joplin as any).window.loadChromeCssFile(`${installDir}/${cssFile}`);
			} catch (e) {}
		}

		await applyTitleInputCss();

		await joplin.settings.onChange(async (event: { keys: string[] }) => {
			if (event.keys.includes('fullNotebookView.hideTitleInput')) {
				await applyTitleInputCss();
			}
		});

		let cachedFolderTree: TreeNode[] = [];
		let allFolders: FolderItem[] = [];

		async function getExcludedIds(): Promise<{ folderIds: string[], noteIds: string[] }> {
			try {
				const folderIds = JSON.parse(await joplin.settings.value('fullNotebookView.excludedFolderIds') || '[]');
				const noteIds = JSON.parse(await joplin.settings.value('fullNotebookView.excludedNoteIds') || '[]');
				return { folderIds, noteIds };
			} catch (e) {
				return { folderIds: [], noteIds: [] };
			}
		}

		async function refreshFolderTree() {
			allFolders = await fetchAllFolders();
			const exclusions = await getExcludedIds();
			const filteredFolders = allFolders.filter(f => !exclusions.folderIds.includes(f.id));
			cachedFolderTree = buildFolderTree(filteredFolders);
			return cachedFolderTree;
		}

		async function getChildFolders(parentId: string): Promise<TreeNode[]> {
			const exclusions = await getExcludedIds();
			return allFolders
				.filter(f => f.parent_id === parentId && !exclusions.folderIds.includes(f.id))
				.map(f => ({
					id: f.id,
					title: f.title,
					type: 'folder' as const,
					parent_id: f.parent_id,
					icon: f.icon,
				}))
				.sort((a, b) => a.title.localeCompare(b.title));
		}

		await joplin.views.panels.onMessage(panel, async (message: any) => {
			switch (message.type) {
				case 'init': {
					const tree = await refreshFolderTree();
					const selectedNote = await joplin.workspace.selectedNote();
					const selectedFolder = await joplin.workspace.selectedFolder();
					return {
						tree: tree,
						selectedNoteId: selectedNote ? selectedNote.id : null,
						selectedFolderId: selectedFolder ? selectedFolder.id : null,
					};
				}

				case 'expandFolder': {
					const folderId = message.folderId;
					const childFolders = await getChildFolders(folderId);
					const allNotes = await fetchNotesInFolder(folderId);
					const exclusions = await getExcludedIds();
					const notes = allNotes.filter(n => !exclusions.noteIds.includes(n.id));
					const noteCount = notes.length;

					const childFolderNodes: TreeNode[] = [];
					for (const cf of childFolders) {
						const subNoteCount = await countNotesInFolder(cf.id);
						childFolderNodes.push({
							...cf,
							note_count: subNoteCount,
						});
					}

					const noteNodes: TreeNode[] = notes.map(n => ({
						id: n.id,
						title: n.title,
						type: 'note' as const,
						parent_id: n.parent_id,
						is_todo: n.is_todo,
						todo_completed: n.todo_completed,
						updated_time: n.updated_time,
					}));

					return {
						folders: childFolderNodes,
						notes: noteNodes,
						noteCount: noteCount,
					};
				}

				case 'openNote': {
					await joplin.commands.execute('openNote', message.noteId);
					return { success: true };
				}

				case 'openFolder': {
					await joplin.commands.execute('openFolder', message.folderId);
					return { success: true };
				}

				case 'createNote': {
					const folderId = message.folderId;
					const targetFolder = folderId || (await joplin.workspace.selectedFolder())?.id;
					if (!targetFolder) return { error: 'No folder selected' };

					const newNote = await joplin.data.post(['notes'], null, {
						title: 'Untitled',
						parent_id: targetFolder,
					});
					await joplin.commands.execute('openNote', newNote.id);
					return {
						note: {
							id: newNote.id,
							title: newNote.title,
							parent_id: newNote.parent_id,
							is_todo: newNote.is_todo || 0,
							todo_completed: newNote.todo_completed || 0,
							updated_time: newNote.updated_time || Date.now(),
						},
					};
				}

			case 'search': {
				const query = message.query;
				const filters = message.filters || {};
				if (!query || query.trim().length === 0) {
					const tree = cachedFolderTree.length > 0 ? cachedFolderTree : await refreshFolderTree();
					return { type: 'tree', tree: tree };
				}

				const includeNotes = filters.includeNotes !== false;
				const includeNotebooks = filters.includeNotebooks !== false;
				const dateAfter = filters.dateAfter || null;
				const dateBefore = filters.dateBefore || null;
				const searchExclusions = await getExcludedIds();

				let noteResults: TreeNode[] = [];
				let folderResults: TreeNode[] = [];

				if (includeNotes) {
					const notes = await searchNotes(query);
					noteResults = notes
						.filter(n => {
							if (searchExclusions.noteIds.includes(n.id)) return false;
							if (searchExclusions.folderIds.includes(n.parent_id)) return false;
							if (dateAfter && n.updated_time < dateAfter) return false;
							if (dateBefore && n.updated_time > dateBefore) return false;
							return true;
						})
						.map(n => ({
							id: n.id,
							title: n.title,
							type: 'note' as const,
							parent_id: n.parent_id,
							is_todo: n.is_todo,
							todo_completed: n.todo_completed,
							updated_time: n.updated_time,
						}));
				}

				if (includeNotebooks) {
					const lowerQuery = query.toLowerCase();
					folderResults = allFolders
						.filter(f => f.title.toLowerCase().includes(lowerQuery) && !searchExclusions.folderIds.includes(f.id))
						.map(f => ({
							id: f.id,
							title: f.title,
							type: 'folder' as const,
							parent_id: f.parent_id,
							icon: f.icon,
						}));
				}

				return {
					type: 'search',
					results: [...folderResults, ...noteResults],
				};
			}

				case 'refreshTree': {
					const tree = await refreshFolderTree();
					return { tree: tree };
				}

			case 'getNoteCount': {
				const count = await countNotesInFolder(message.folderId);
				return { count: count };
			}

			case 'getHeadings': {
				const note = await joplin.workspace.selectedNote();
				if (!note || !note.body) return { headings: [], noteTitle: '' };
				const headings = extractHeadings(note.body);
				return { headings: headings, noteTitle: note.title || 'Untitled' };
			}

		case 'scrollToHash': {
			await joplin.commands.execute('scrollToHash', message.hash);
			return { success: true };
		}

		case 'startSync': {
			await joplin.commands.execute('synchronize');
			return { success: true };
		}

		case 'getNotePath': {
			const noteId = message.noteId;
			if (!noteId) return { path: [] };
			try {
				const note = await joplin.data.get(['notes', noteId], { fields: ['parent_id'] });
				if (!note) return { path: [] };
				const folderPath: string[] = [];
				let currentFolderId = note.parent_id;
				const folderMap = new Map(allFolders.map(f => [f.id, f]));
				while (currentFolderId) {
					folderPath.unshift(currentFolderId);
					const folder = folderMap.get(currentFolderId);
					if (!folder) break;
					currentFolderId = folder.parent_id;
				}
				return { path: folderPath };
			} catch (e) {
				return { path: [] };
			}
		}

		case 'getFolderPath': {
			const targetFolderId = message.folderId;
			if (!targetFolderId) return { path: [] };
			const folderMap2 = new Map(allFolders.map(f => [f.id, f]));
			const ancestorPath: string[] = [];
			const targetFolder = folderMap2.get(targetFolderId);
			let currentId = targetFolder ? targetFolder.parent_id : null;
			while (currentId) {
				ancestorPath.unshift(currentId);
				const folder = folderMap2.get(currentId);
				if (!folder) break;
				currentId = folder.parent_id;
			}
			return { path: ancestorPath };
		}

		case 'getExclusions': {
			try {
				const folderIds = JSON.parse(await joplin.settings.value('fullNotebookView.excludedFolderIds') || '[]');
				const noteIds = JSON.parse(await joplin.settings.value('fullNotebookView.excludedNoteIds') || '[]');
				const folderNames: Record<string, string> = {};
				const noteNames: Record<string, string> = {};
				for (const fid of folderIds) {
					try {
						const f = await joplin.data.get(['folders', fid], { fields: ['title'] });
						if (f) folderNames[fid] = f.title;
					} catch (e) { folderNames[fid] = '(deleted)'; }
				}
				for (const nid of noteIds) {
					try {
						const n = await joplin.data.get(['notes', nid], { fields: ['title'] });
						if (n) noteNames[nid] = n.title;
					} catch (e) { noteNames[nid] = '(deleted)'; }
				}
				return { excludedFolderIds: folderIds, excludedNoteIds: noteIds, folderNames, noteNames };
			} catch (e) {
				return { excludedFolderIds: [], excludedNoteIds: [], folderNames: {}, noteNames: {} };
			}
		}

		case 'saveExclusions': {
			await joplin.settings.setValue('fullNotebookView.excludedFolderIds', JSON.stringify(message.excludedFolderIds || []));
			await joplin.settings.setValue('fullNotebookView.excludedNoteIds', JSON.stringify(message.excludedNoteIds || []));
			return { success: true };
		}

		case 'addExclusion': {
			const key = message.itemType === 'folder' ? 'fullNotebookView.excludedFolderIds' : 'fullNotebookView.excludedNoteIds';
			const current = JSON.parse(await joplin.settings.value(key) || '[]');
			if (!current.includes(message.itemId)) {
				current.push(message.itemId);
				await joplin.settings.setValue(key, JSON.stringify(current));
			}
			return { success: true };
		}

		case 'removeExclusion': {
			const rkey = message.itemType === 'folder' ? 'fullNotebookView.excludedFolderIds' : 'fullNotebookView.excludedNoteIds';
			const rcurrent = JSON.parse(await joplin.settings.value(rkey) || '[]');
			const filtered = rcurrent.filter((id: string) => id !== message.itemId);
			await joplin.settings.setValue(rkey, JSON.stringify(filtered));
			return { success: true };
		}

		case 'openNoteInNewWindow': {
			try {
				await joplin.commands.execute('openNoteInNewWindow', message.noteId);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			return { success: true };
		}

		case 'duplicateNote': {
			try {
				await joplin.commands.execute('duplicateNote', [message.noteId]);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			return { success: true };
		}

		case 'copyMarkdownLink': {
			const linkTitle = message.noteTitle || 'Untitled';
			const mdLink = `[${linkTitle}](:/${message.noteId})`;
			return { success: true, clipboardText: mdLink };
		}

		case 'moveToFolder': {
			try {
				await joplin.commands.execute('moveToFolder', [message.itemId]);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			return { success: true };
		}

		case 'exportNote': {
			try {
				await joplin.commands.execute('exportNotes', [message.noteId]);
			} catch (e) {
				return { success: false, error: 'Export not available' };
			}
			return { success: true };
		}

		case 'exportFolder': {
			try {
				await joplin.commands.execute('exportFolders', [message.folderId]);
			} catch (e) {
				return { success: false, error: 'Export not available' };
			}
			return { success: true };
		}

		case 'showNoteProperties': {
			try {
				await joplin.commands.execute('showNoteProperties', message.noteId);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			return { success: true };
		}

		case 'publishNote': {
			try {
				await joplin.commands.execute('showShareNoteDialog', [message.noteId]);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			return { success: true };
		}

		case 'newSubNotebook': {
			const parentId = message.parentId || '';
			try {
				await joplin.commands.execute('newFolder', parentId);
			} catch (e) {
				return { success: false, error: 'Command not available' };
			}
			setTimeout(async () => {
				await notifyTreeRefresh();
			}, 500);
			return { success: true };
		}

		case 'renameItem': {
			const { itemId, itemType, newTitle } = message;
			if (itemType === 'note') {
				await joplin.data.put(['notes', itemId], null, { title: newTitle });
			} else if (itemType === 'folder') {
				await joplin.data.put(['folders', itemId], null, { title: newTitle });
			}
			return { success: true };
		}

		case 'deleteNote': {
			await joplin.data.delete(['notes', message.noteId]);
			return { success: true };
		}

		case 'deleteFolder': {
			await joplin.data.delete(['folders', message.folderId]);
			allFolders = allFolders.filter(f => f.id !== message.folderId);
			cachedFolderTree = buildFolderTree(allFolders);
			return { success: true };
		}

			default:
					return null;
			}
		});

	async function notifyNoteSelection() {
		try {
			const selectedNote = await joplin.workspace.selectedNote();
			const selectedFolder = await joplin.workspace.selectedFolder();
			joplin.views.panels.postMessage(panel, {
				type: 'noteSelected',
				noteId: selectedNote ? selectedNote.id : null,
				folderId: selectedFolder ? selectedFolder.id : null,
			});
		} catch (e) {
			// panel may not be ready yet
		}
	}

	async function notifyTocUpdate() {
		try {
			const note = await joplin.workspace.selectedNote();
			if (!note || !note.body) {
				joplin.views.panels.postMessage(panel, {
					type: 'tocUpdated',
					headings: [],
					noteTitle: '',
				});
				return;
			}
			const headings = extractHeadings(note.body);
			joplin.views.panels.postMessage(panel, {
				type: 'tocUpdated',
				headings: headings,
				noteTitle: note.title || 'Untitled',
			});
		} catch (e) {
			// panel may not be ready yet
		}
	}

		async function notifyTreeRefresh() {
			try {
				const tree = await refreshFolderTree();
				joplin.views.panels.postMessage(panel, {
					type: 'treeRefreshed',
					tree: tree,
				});
			} catch (e) {
				// panel may not be ready yet
			}
		}

	await joplin.workspace.onNoteSelectionChange(async () => {
		await notifyNoteSelection();
		await notifyTocUpdate();
	});

	await joplin.workspace.onSyncComplete(async () => {
		await notifyTreeRefresh();
		try {
			joplin.views.panels.postMessage(panel, {
				type: 'syncCompleted',
				withErrors: false,
				time: Date.now(),
			});
		} catch (e) {
			// panel may not be ready yet
		}
	});

	await joplin.workspace.onSyncStart(async () => {
		try {
			joplin.views.panels.postMessage(panel, {
				type: 'syncStarted',
				time: Date.now(),
			});
		} catch (e) {
			// panel may not be ready yet
		}
	});

	await joplin.workspace.onNoteChange(async () => {
		await notifyNoteSelection();
		await notifyTocUpdate();
	});

		await joplin.commands.register({
			name: 'fullNotebookView.togglePanel',
			label: 'Toggle Full Notebook View',
			iconName: 'fas fa-folder-tree',
			execute: async () => {
				const isVisible = await joplin.views.panels.visible(panel);
				await joplin.views.panels.show(panel, !isVisible);
			},
		});

		await joplin.views.toolbarButtons.create(
			'fullNotebookView.togglePanelBtn',
			'fullNotebookView.togglePanel',
			ToolbarButtonLocation.NoteToolbar
		);
	},
});
