import { Command } from './types';

export default class JoplinCommands {
	register(command: Command): Promise<void>;
	execute(commandName: string, ...args: any[]): Promise<any>;
}
