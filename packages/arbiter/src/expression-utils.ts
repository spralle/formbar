import { assertSafeSegment, evaluate } from "kuery";
import type { ExprNode } from "kuery";

/**
 * Evaluate a kuery expression against a data context.
 * This is a convenience re-export for consumers using expressions with arbiter rules.
 */
export function evaluateExpression(expr: ExprNode, context: Record<string, unknown>): unknown {
	return evaluate(expr, context);
}

export { assertSafeSegment };
export type { ExprNode };
