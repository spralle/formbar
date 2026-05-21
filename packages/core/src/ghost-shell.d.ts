declare module "@ghost-shell/arbiter" {
	export interface ProductionRule {
		id: string;
		conditions: unknown;
		actions: unknown;
		priority?: number;
		[key: string]: unknown;
	}

	export interface FiringResult {
		firedRules: string[];
		actions: Array<{ type: string; path: string; value?: unknown }>;
		changes: Array<{ path: string; newValue?: unknown; oldValue?: unknown; ruleName?: string }>;
		[key: string]: unknown;
	}

	export interface RuleSession {
		insert(fact: Record<string, unknown>): void;
		assert(path: string, value: unknown): void;
		fire(): FiringResult;
		retract(factId: string): void;
		dispose(): void;
	}

	export interface SessionConfig {
		rules: ProductionRule[];
		[key: string]: unknown;
	}

	export function createSession(config: { rules: readonly ProductionRule[]; initialState?: Record<string, unknown> }): RuleSession;
}

declare module "@ghost-shell/predicate" {
	export type EvaluationScope = Record<string, unknown>;
	export type ExprNode = { type: string; [key: string]: unknown };
	export interface ExpressionDefinition {
		expr: ExprNode;
		scope?: EvaluationScope;
		[key: string]: unknown;
	}
	export function evaluate(expr: ExprNode, context: Record<string, unknown>): unknown;
	export function assertSafeSegment(segment: string): void;
}
