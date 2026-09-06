export function toIdPart(value: string): string {
	return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "field";
}

export function createRadioOptionId(controlId: string, value: string, index: number): string {
	return `${controlId}-option-${index}-${toIdPart(value)}`;
}
