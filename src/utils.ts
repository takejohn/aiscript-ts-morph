import * as path from '@std/path';

export function resolve(relativePath: string): string {
	return path.join('..', 'aiscript', relativePath);
}
