import { MethodDeclaration, Node, Project, SourceFile, ts } from 'ts-morph';
import { resolve } from './utils.ts';

export class EvaluatorMethodImplementation {
	readonly nodeTsTypes: ReadonlySet<string>;

	readonly name: string;

	readonly statement: Node;

	constructor(nodeTsTypes: readonly string[], statement: Node) {
		this.nodeTsTypes = new Set(nodeTsTypes);
		this.name = joinCamelCased([...this.nodeTsTypes]);
		this.statement = statement;
	}

	setMethodBody(method: MethodDeclaration): void {
		const text = this.statement.getText().split('\n').map((line) =>
			line.replace(/^\t\t\t/, '')
		).join('\n');
		if (Node.isBlock(this.statement)) {
			method.getBodyOrThrow().asKindOrThrow(ts.SyntaxKind.Block)
				.replaceWithText(text);
		} else {
			method.setBodyText(text);
		}
	}
}

export class EvaluatorImplementation {
	readonly nodeTsTypes: ReadonlySet<string>;

	readonly name: string;

	readonly asyncImplementation: EvaluatorMethodImplementation;

	readonly syncImplementation: EvaluatorMethodImplementation;

	constructor(
		asyncImplementation: EvaluatorMethodImplementation,
		syncImplementation: EvaluatorMethodImplementation,
	) {
		expectSetsEqual(
			asyncImplementation.nodeTsTypes,
			syncImplementation.nodeTsTypes,
		);
		this.nodeTsTypes = asyncImplementation.nodeTsTypes;
		this.name = joinCamelCased([...this.nodeTsTypes]);
		this.asyncImplementation = asyncImplementation;
		this.syncImplementation = syncImplementation;
	}

	createSourceFile(project: Project): SourceFile {
		const evaluatorSourceFile = project.createSourceFile(
			resolve(`src/interpreter/evaluators/${this.name}.ts`),
			createSourceCode(this.name, this.nodeTsType()),
			{ overwrite: true },
		);
		const evaluatorObject = evaluatorSourceFile
			.getVariableDeclarationOrThrow(`${this.name}Evaluator`)
			.getFirstChildByKindOrThrow(ts.SyntaxKind.ObjectLiteralExpression);
		const asyncMethod = evaluatorObject.getPropertyOrThrow('evalAsync')
			.asKindOrThrow(ts.SyntaxKind.MethodDeclaration);
		const syncMethod = evaluatorObject.getPropertyOrThrow('evalSync')
			.asKindOrThrow(ts.SyntaxKind.MethodDeclaration);
		this.asyncImplementation.setMethodBody(asyncMethod);
		this.syncImplementation.setMethodBody(syncMethod);
		evaluatorSourceFile.forEachDescendant((node) => {
			if (Node.isThisExpression(node)) {
				node.replaceWithText('context');
			}
		});
		return evaluatorSourceFile;
	}

	nodeTsType(): string {
		return `Ast.Node & { type: ${
			[...this.nodeTsTypes.values().map((nodeType) => `'${nodeType}'`)].join(
				' | ',
			)
		} }`;
	}
}

function joinCamelCased(strings: readonly string[]): string {
	if (strings.length === 0) {
		return '';
	}
	let result = strings[0];
	for (const string of strings.slice(1)) {
		result += capitalize(string);
	}
	return result;
}

function capitalize(string: string): string {
	if (string.length === 0) {
		return string;
	}
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function expectSetsEqual<E>(set1: ReadonlySet<E>, set2: ReadonlySet<E>): void {
	if (set1.size !== set2.size) {
		throw new RangeError(
			`Sets have different size, set1: ${set1.size}, set2: ${set2.size}`,
		);
	}
	for (const value of set1.values()) {
		if (!set2.has(value)) {
			throw new TypeError(`Value '${value}' exists in set1, but not in set2`);
		}
	}
}

const createSourceCode = (name: string, nodeTsType: string) =>
	`import { autobind } from '../../utils/mini-autobind.js';
import { AiScriptError, NonAiScriptError, AiScriptNamespaceError, AiScriptIndexOutOfRangeError, AiScriptRuntimeError, AiScriptHostsideError } from '../../error.js';
import * as Ast from '../../node.js';
import { nodeToJs } from '../../utils/node-to-js.js';
import { Scope } from '../scope.js';
import { std } from '../lib/std.js';
import { RETURN, unWrapRet, BREAK, CONTINUE, assertValue, isControl, type Control, unWrapLabeledBreak } from '../control.js';
import { assertNumber, assertString, assertFunction, assertBoolean, assertObject, assertArray, eq, isObject, isArray, expectAny, reprValue, isFunction } from '../util.js';
import { NULL, FN_NATIVE, BOOL, NUM, STR, ARR, OBJ, FN, ERROR } from '../value.js';
import { getPrimProp } from '../primitive-props.js';
import { Variable } from '../variable.js';
import { Reference } from '../reference.js';
import type { JsValue } from '../util.js';
import type { Value, VFn, VUserFn } from '../value.js';
import type { AsyncEvaluationContext, CallInfo, Evaluator, SyncEvaluationContext } from '../evaluation.js';

export const ${name}Evaluator: Evaluator<${nodeTsType}> = {
	async evalAsync(context: AsyncEvaluationContext, node: ${nodeTsType}, scope: Scope, callStack: readonly CallInfo[]): Promise<Value | Control> {
	},

	evalSync(context: SyncEvaluationContext, node: ${nodeTsType}, scope: Scope, callStack: readonly CallInfo[]): Value | Control {
	},
};
`;
