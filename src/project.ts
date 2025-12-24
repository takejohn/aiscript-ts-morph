import {
	CaseClause,
	IndentationText,
	MethodDeclaration,
	Project,
	ts,
} from 'ts-morph';
import { resolve } from './utils.ts';

export const project = new Project({
	tsConfigFilePath: resolve('tsconfig.json'),
	manipulationSettings: {
		indentationText: IndentationText.Tab,
	},
});

export const interpreterClass = project.getSourceFileOrThrow(
	resolve('src/interpreter/index.ts'),
).getClassOrThrow('Interpreter');

export const asyncCases = getCaseClauses(
	interpreterClass.getInstanceMethodOrThrow('__eval'),
);

export const syncCases = getCaseClauses(
	interpreterClass.getInstanceMethodOrThrow('__evalSync'),
);

function getCaseClauses(method: MethodDeclaration): CaseClause[] {
	return method
		.getBodyOrThrow()
		.getChildSyntaxListOrThrow()
		.getFirstChildByKindOrThrow(ts.SyntaxKind.SwitchStatement)
		.getCaseBlock()
		.getDescendantsOfKind(ts.SyntaxKind.CaseClause);
}
