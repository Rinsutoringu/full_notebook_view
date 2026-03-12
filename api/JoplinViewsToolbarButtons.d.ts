import { ToolbarButtonLocation } from './types';

export default class JoplinViewsToolbarButtons {
	create(id: string, commandName: string, location: ToolbarButtonLocation): Promise<void>;
}
