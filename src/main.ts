import { CaseClause, Node, ts } from 'ts-morph';
import { asyncCases, project, syncCases } from './project.ts';
import {
	EvaluatorMethodImplementation,
	EvaluatorImplementation,
} from './evaluatorImplementation.ts';

function asSingleStatementOrThrow(statements: readonly Node[]): Node {
	if (statements.length !== 1) {
		throw new RangeError(`Unexpected statement count: ${statements.length}`);
	}
	return statements[0];
}

function toEvaluatorImplementationMap(
	caseClauses: CaseClause[],
): Map<string, EvaluatorMethodImplementation> {
	const result = new Map<string, EvaluatorMethodImplementation>();
	let currentNodeTypes: string[] = [];
	for (const caseClause of caseClauses) {
		const [expression, ...statements] = caseClause.forEachChildAsArray();
		const nodeType = expression.asKindOrThrow(ts.SyntaxKind.StringLiteral)
			.getLiteralValue();
		currentNodeTypes.push(nodeType);
		if (statements.length === 0) {
			continue;
		}
		const statement = asSingleStatementOrThrow(statements);
		const implementation = new EvaluatorMethodImplementation(
			currentNodeTypes,
			statement,
		);
		for (const currentNodeType of currentNodeTypes) {
			result.set(currentNodeType, implementation);
		}
		currentNodeTypes = [];
	}
	return result;
}

function zipMaps<K, V1, V2>(
	map1: Map<K, V1>,
	map2: Map<K, V2>,
): Map<K, [V1, V2]> {
	if (map1.size !== map2.size) {
		throw new RangeError(
			`Maps have different size, map1: ${map1.size}, map2: ${map2.size}`,
		);
	}
	const result = new Map<K, [V1, V2]>();
	for (const [key, value1] of map1.entries()) {
		if (!map2.has(key)) {
			throw new TypeError(`Key '${key}' exists in map1, but not in map2`);
		}
		const value2 = map2.get(key)!;
		result.set(key, [value1, value2]);
	}
	return result;
}

const asyncMap = toEvaluatorImplementationMap(asyncCases);
const syncMap = toEvaluatorImplementationMap(syncCases);
await Promise.all(
	new Set(zipMaps(asyncMap, syncMap).values()).values()
		.map(([asyncImplementation, syncImplementation]) =>
			new EvaluatorImplementation(asyncImplementation, syncImplementation)
		)
		.map((implementation) => implementation.createSourceFile(project))
		.map((sourceFile) => sourceFile.save()),
);
