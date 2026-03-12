import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinSettings from './JoplinSettings';
import { VersionInfo } from './types';

export default class Joplin {
	get data(): JoplinData;
	get plugins(): JoplinPlugins;
	get workspace(): JoplinWorkspace;
	get commands(): JoplinCommands;
	get views(): JoplinViews;
	get settings(): JoplinSettings;
	require(_path: string): any;
	versionInfo(): Promise<VersionInfo>;
}
