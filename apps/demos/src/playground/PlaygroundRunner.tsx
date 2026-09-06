import { DemoFormRoot, type DemoFormSnapshot } from "../renderers/DemoFormRoot";
import type { PlaygroundDocument } from "./contracts";

interface PlaygroundRunnerProps {
	readonly document: PlaygroundDocument;
	readonly onSnapshot: (snapshot: DemoFormSnapshot) => void;
}

export function PlaygroundRunner({ document, onSnapshot }: PlaygroundRunnerProps) {
	return (
		<DemoFormRoot
			schema={document.schema}
			data={document.initialData}
			{...(document.layout ? { layout: document.layout } : {})}
			rules={document.rules}
			initialUiState={document.initialUiState}
			onChange={() => undefined}
			onSnapshot={onSnapshot}
			responsive
		/>
	);
}
