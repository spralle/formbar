import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	readonly children: ReactNode;
}

interface State {
	readonly error: Error | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Playground preview failed", error, info);
	}

	render() {
		if (this.state.error) {
			return (
				<div role="alert" tabIndex={-1} className="rounded-lg border border-destructive bg-destructive-background p-4">
					<h2 className="font-semibold text-destructive">Preview failed</h2>
					<p className="mt-2 text-sm text-destructive-foreground-muted">{this.state.error.message}</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Your editor sources are unchanged. Fix them and apply again.
					</p>
				</div>
			);
		}
		return this.props.children;
	}
}
