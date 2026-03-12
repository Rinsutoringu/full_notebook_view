import { Disposable } from './types';

interface NoteSelectionChangeEvent {
	value: string[];
}

interface ItemChangeEvent {
	id: string;
	event: number;
}

interface SyncCompleteEvent {
	withErrors: boolean;
}

type WorkspaceEventHandler<T> = (event: T) => void;

export default class JoplinWorkspace {
	onNoteSelectionChange(callback: WorkspaceEventHandler<NoteSelectionChangeEvent>): Promise<Disposable>;
	onNoteChange(handler: WorkspaceEventHandler<ItemChangeEvent>): Promise<Disposable>;
	onSyncComplete(callback: WorkspaceEventHandler<SyncCompleteEvent>): Promise<Disposable>;
	onSyncStart(handler: () => void): Promise<Disposable>;
	selectedNote(): Promise<any>;
	selectedFolder(): Promise<any>;
	selectedNoteIds(): Promise<string[]>;
}
