import { Path } from './types';

export default class JoplinData {
	get(path: Path, query?: any): Promise<any>;
	post(path: Path, query?: any, body?: any, files?: any[]): Promise<any>;
	put(path: Path, query?: any, body?: any, files?: any[]): Promise<any>;
	delete(path: Path, query?: any): Promise<any>;
}
