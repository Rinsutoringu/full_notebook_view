import { SettingItem, SettingSection } from './types';

export default class JoplinSettings {
	registerSettings(settings: Record<string, SettingItem>): Promise<void>;
	registerSection(name: string, section: SettingSection): Promise<void>;
	value(key: string): Promise<any>;
	setValue(key: string, value: any): Promise<void>;
	globalValue(key: string): Promise<any>;
	onChange(handler: (event: { keys: string[] }) => void): Promise<void>;
}
