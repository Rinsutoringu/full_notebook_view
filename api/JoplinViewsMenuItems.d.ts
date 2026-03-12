import { MenuItemLocation, CreateMenuItemOptions } from './types';

export default class JoplinViewsMenuItems {
	create(id: string, commandName: string, location?: MenuItemLocation, options?: CreateMenuItemOptions): Promise<void>;
}
