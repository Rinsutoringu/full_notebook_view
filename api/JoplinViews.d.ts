import JoplinViewsPanels from './JoplinViewsPanels';
import JoplinViewsToolbarButtons from './JoplinViewsToolbarButtons';
import JoplinViewsMenuItems from './JoplinViewsMenuItems';

export default class JoplinViews {
	get panels(): JoplinViewsPanels;
	get toolbarButtons(): JoplinViewsToolbarButtons;
	get menuItems(): JoplinViewsMenuItems;
}
