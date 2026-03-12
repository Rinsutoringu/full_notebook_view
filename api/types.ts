export interface Command {
	name: string;
	label?: string;
	iconName?: string;
	execute(...args: any[]): Promise<any | void>;
	enabledCondition?: string;
}

export enum FileSystemItem {
	File = 'file',
	Directory = 'directory',
}

export enum ModelType {
	Note = 1,
	Folder = 2,
	Setting = 3,
	Resource = 4,
	Tag = 5,
	NoteTag = 6,
	Search = 7,
	Alarm = 8,
	MasterKey = 9,
	ItemChange = 10,
	NoteResource = 11,
	ResourceLocalState = 12,
	Revision = 13,
	Migration = 14,
	SmartFilter = 15,
	Command = 16,
}

export interface VersionInfo {
	version: string;
	profileVersion: number;
	syncVersion: number;
	platform: 'desktop' | 'mobile';
}

export interface CreateMenuItemOptions {
	accelerator: string;
}

export enum MenuItemLocation {
	File = 'file',
	Edit = 'edit',
	View = 'view',
	Note = 'note',
	Tools = 'tools',
	Help = 'help',
	Context = 'context',
	NoteListContextMenu = 'noteListContextMenu',
	EditorContextMenu = 'editorContextMenu',
	FolderContextMenu = 'folderContextMenu',
	TagContextMenu = 'tagContextMenu',
}

export interface MenuItem {
	commandName?: string;
	commandArgs?: any[];
	type?: ('normal' | 'separator' | 'submenu' | 'checkbox' | 'radio');
	accelerator?: string;
	submenu?: MenuItem[];
	label?: string;
}

export interface ButtonSpec {
	id: ButtonId;
	title?: string;
	onClick?(): void;
}

export type ButtonId = string;

export enum ToolbarButtonLocation {
	NoteToolbar = 'noteToolbar',
	EditorToolbar = 'editorToolbar',
}

export type ViewHandle = string;

export interface DialogResult {
	id: ButtonId;
	formData?: any;
}

export interface Disposable {}

export type Path = string[];

export enum SettingItemType {
	Int = 1,
	String = 2,
	Bool = 3,
	Array = 4,
	Object = 5,
	Button = 6,
}

export enum SettingItemSubType {
	FilePathAndArgs = 'file_path_and_args',
	FilePath = 'file_path',
	DirectoryPath = 'directory_path',
}

export enum AppType {
	Desktop = 'desktop',
	Mobile = 'mobile',
	Cli = 'cli',
}

export enum SettingStorage {
	Database = 1,
	File = 2,
}

export interface SettingItem {
	value: any;
	type: SettingItemType;
	subType?: SettingItemSubType;
	label: string;
	description?: string;
	public: boolean;
	section?: string;
	isEnum?: boolean;
	options?: Record<any, any>;
	appTypes?: AppType[];
	secure?: boolean;
	advanced?: boolean;
	minimum?: number;
	maximum?: number;
	step?: number;
	storage?: SettingStorage;
}

export interface SettingSection {
	label: string;
	iconName?: string;
	description?: string;
	name?: string;
}

export enum ContentScriptType {
	MarkdownItPlugin = 'markdownItPlugin',
	CodeMirrorPlugin = 'codeMirrorPlugin',
}

export type FilterHandler<T> = (object: T) => Promise<T>;

export interface EditContextMenuFilterObject {
	items: MenuItem[];
}

export interface WebviewApi {
	postMessage: (message: object) => unknown;
	onMessage: (message: object) => void;
}
