import { CaseClause, Node } from 'ts-morph';
import { asyncCases, syncCases } from './project.ts';

function findUsedPropertiesInCase(caseClause: CaseClause): Set<string> {
	const result = new Set<string>();
	caseClause.forEachDescendant((node) => {
		if (Node.isPropertyAccessExpression(node)) {
			const [target, _dot, propName] = node.getChildren();
			if (Node.isThisExpression(target) && Node.isIdentifier(propName)) {
				result.add(propName.getText());
			}
		}
	});
	return result;
}

function findUsedPropertiesInCases(cases: CaseClause[]): Set<string> {
	const result = new Set<string>();
	for (const caseClause of cases) {
		for (const propName of findUsedPropertiesInCase(caseClause)) {
			result.add(propName);
		}
	}
	return result;
}

function sortAndJoin(strings: Iterable<string>): string {
	const sorted = [...strings].sort((a, b) => {
		if (a > b) {
			return 1;
		} else if (a === b) {
			return 0;
		} else {
			return -1;
		}
	});
	return sorted.join(', ');
}

const asyncUsedProperties = findUsedPropertiesInCases(asyncCases);
const syncUsedProperties = findUsedPropertiesInCases(syncCases);
const commonlyUsedProperties = asyncUsedProperties.intersection(
	syncUsedProperties,
);
console.log('Commonly used properties:', sortAndJoin(commonlyUsedProperties));
console.log(
	'Used properties only in async method:',
	sortAndJoin(asyncUsedProperties.difference(commonlyUsedProperties)),
);
console.log(
	'Used properties only in sync method:',
	sortAndJoin(syncUsedProperties.difference(commonlyUsedProperties)),
);
