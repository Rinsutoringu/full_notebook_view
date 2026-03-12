import { ViewHandle } from './types';

export default class JoplinViewsPanels {
	create(id: string): Promise<ViewHandle>;
	setHtml(handle: ViewHandle, html: string): Promise<string>;
	addScript(handle: ViewHandle, scriptPath: string): Promise<void>;
	onMessage(handle: ViewHandle, callback: Function): Promise<void>;
	postMessage(handle: ViewHandle, message: any): void;
	show(handle: ViewHandle, show?: boolean): Promise<void>;
	hide(handle: ViewHandle): Promise<void>;
	visible(handle: ViewHandle): Promise<boolean>;
}
