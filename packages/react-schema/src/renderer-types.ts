import type { ValidationIssue } from "@formbar/core";
import type { LayoutNode } from "@formbar/from-schema";
import type { FieldA11yProps } from "@formbar/react";
import type { ComponentType, ReactNode } from "react";

/** ARIA attributes derived from field state — alias for FieldA11yProps */
export type FieldAriaAttributes = FieldA11yProps;

/** Props passed to every layout node renderer */
export interface LayoutRendererProps {
	readonly node: LayoutNode;
	readonly children?: ReactNode;
	readonly aria?: FieldAriaAttributes;
	readonly issues?: readonly ValidationIssue[];
}

/** A renderer for a specific node type */
export interface NodeRenderer {
	readonly type: string;
	readonly component: ComponentType<LayoutRendererProps>;
}
