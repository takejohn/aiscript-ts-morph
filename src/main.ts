import { Project } from 'ts-morph';
import { resolve } from './utils.ts';

const project = new Project({
	tsConfigFilePath: resolve('tsconfig.json'),
});
