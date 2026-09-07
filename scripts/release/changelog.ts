export function extractVersionNotes(changelog: string, version: string): string {
	const normalized = changelog.replaceAll("\r\n", "\n");
	const heading = `## ${version}`;
	const lines = normalized.split("\n");
	const start = lines.findIndex((line) => line.trim() === heading);
	if (start < 0) throw new Error(`CHANGELOG is missing ${heading}`);

	let end = lines.length;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (lines[index]?.startsWith("## ")) {
			end = index;
			break;
		}
	}
	const notes = lines
		.slice(start + 1, end)
		.join("\n")
		.trim();
	if (!notes) throw new Error(`CHANGELOG section ${heading} is empty`);
	return notes;
}

export function isPrerelease(version: string): boolean {
	const core = version.split("+", 1)[0] ?? version;
	return core.includes("-");
}
