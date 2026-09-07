# @formbar/react

React hooks and accessibility helpers for forms created with `@formbar/core`.

## Install

```bash
bun add @formbar/react @formbar/core react
# or
npm install @formbar/react @formbar/core react
```

## Minimal usage

```tsx
import { useField, useForm } from "@formbar/react";

type Contact = {
	email: string;
};

export function ContactForm() {
	const form = useForm<Contact, Record<string, never>>({
		initialData: { email: "" },
		onSubmit: async ({ payload }) => {
			await saveContact(payload);
			return { ok: true, submitId: "contact-create" };
		},
	});
	const email = useField(form, "email", { label: "Email", required: true });

	return (
		<form onSubmit={(event) => void event.preventDefault()}>
			<input
				value={email.get() ?? ""}
				onBlur={() => email.handleBlur()}
				onChange={(event) => email.handleChange(event.currentTarget.value)}
			/>
			<button type="button" onClick={() => void form.submit()}>
				Save
			</button>
		</form>
	);
}
```

## When to use this package

- Use `@formbar/react` when you want React lifecycle management, field subscriptions, selectors, and ARIA helpers for a Formbar form.
- Use `@formbar/core` directly for non-React environments or custom framework bindings.
- Use `@formbar/react-schema` when forms should be prepared from schemas and rendered through layout nodes.

## Dependencies

- Depends on `@formbar/core`.
- Peer dependency: `react >=18.0.0`.

`autoFocusOnError` is handled by `useForm` and is not forwarded to core. Other options are forwarded unchanged, so
core's development-only unknown-option diagnostics also apply to `useForm` without duplicate React-option warnings.
