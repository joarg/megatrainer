<!--
	Renders the small Markdown subset the coach models actually emit, as real Svelte
	nodes rather than as HTML.

	Deliberately does NOT use `{@html}`. The text here is LLM output, so injecting it
	as HTML would mean either trusting the model or sanitising it; both are worse than
	not generating HTML at all. Interpolating into Svelte elements escapes everything
	by construction, so there is no injection surface to defend. If we later need
	arbitrary Markdown, that decision should be its own change with its own sanitiser.
-->
<script lang="ts">
	let { text = '' }: { text?: string } = $props();

	type Inline = { kind: 'text' | 'strong' | 'em' | 'code'; value: string };
	type Block =
		| { kind: 'p'; inlines: Inline[] }
		| { kind: 'ol' | 'ul'; items: Inline[][] };

	// Bold is matched before italic so `**x**` is not read as two italic runs, and
	// everything is constrained to a single line so emphasis cannot span paragraphs.
	// The character class excludes the delimiter itself, so `**` can never match as
	// empty or unbalanced content.
	const INLINE_RE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

	function parseInline(source: string): Inline[] {
		const out: Inline[] = [];
		let last = 0;
		for (const match of source.matchAll(INLINE_RE)) {
			const start = match.index ?? 0;
			if (start > last) out.push({ kind: 'text', value: source.slice(last, start) });

			const token = match[0];
			if (token.startsWith('**') || token.startsWith('__')) {
				out.push({ kind: 'strong', value: token.slice(2, -2) });
			} else if (token.startsWith('`')) {
				out.push({ kind: 'code', value: token.slice(1, -1) });
			} else {
				out.push({ kind: 'em', value: token.slice(1, -1) });
			}
			last = start + token.length;
		}
		if (last < source.length) out.push({ kind: 'text', value: source.slice(last) });
		return out;
	}

	const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;
	const BULLET_RE = /^\s*[-*+]\s+(.*)$/;
	const HEADING_RE = /^(#{1,4})\s+(.*)$/;

	function parseBlocks(source: string): Block[] {
		// Normalise line endings, but keep the blank-line structure that separates
		// paragraphs — the chat bubbles rely on it.
		const lines = source.replace(/\r\n?/g, '\n').split('\n');
		const blocks: Block[] = [];
		let paragraph: string[] = [];

		const flushParagraph = () => {
			if (!paragraph.length) return;
			blocks.push({ kind: 'p', inlines: parseInline(paragraph.join('\n')) });
			paragraph = [];
		};

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Headings are rare from these models, but a stray `###` should not be shown
			// as literal hashes. Flatten to a bolded lead-in rather than pulling in a
			// whole heading scale.
			const heading = HEADING_RE.exec(line);
			if (heading) {
				flushParagraph();
				blocks.push({ kind: 'p', inlines: [{ kind: 'strong', value: heading[2] }] });
				continue;
			}

			const ordered = ORDERED_RE.exec(line);
			const bullet = BULLET_RE.exec(line);
			if (ordered || bullet) {
				flushParagraph();
				const kind: 'ol' | 'ul' = ordered ? 'ol' : 'ul';
				const items: Inline[][] = [];
				// Consume following lines of the same kind as one list. A line that
				// breaks the pattern (or ends the block) closes the list, so mixed
				// content does not get absorbed.
				while (i < lines.length) {
					const next = ORDERED_RE.exec(lines[i]);
					const nextBullet = BULLET_RE.exec(lines[i]);
					if (kind === 'ol' ? !next : !nextBullet) break;
					items.push(parseInline((next ?? nextBullet)![1]));
					i++;
				}
				i--; // the loop's final i++ must not swallow the next line
				blocks.push({ kind, items });
				continue;
			}

			if (line.trim() === '') flushParagraph();
			else paragraph.push(line);
		}

		flushParagraph();
		return blocks;
	}

	const blocks = $derived(parseBlocks(text));
</script>

<div class="md">
	{#each blocks as block, i (i)}
		{#if block.kind === 'p'}
			<p>
				{#each block.inlines as part, j (j)}{#if part.kind === 'strong'}<strong
						>{part.value}</strong
					>{:else if part.kind === 'em'}<em>{part.value}</em
					>{:else if part.kind === 'code'}<code>{part.value}</code>{:else}{part.value}{/if}{/each}
			</p>
		{:else if block.kind === 'ol'}
			<ol>
				{#each block.items as item, j (j)}
					<li>
						{#each item as part, k (k)}{#if part.kind === 'strong'}<strong
								>{part.value}</strong
							>{:else if part.kind === 'em'}<em>{part.value}</em
							>{:else if part.kind === 'code'}<code>{part.value}</code>{:else}{part.value}{/if}{/each}
					</li>
				{/each}
			</ol>
		{:else}
			<ul>
				{#each block.items as item, j (j)}
					<li>
						{#each item as part, k (k)}{#if part.kind === 'strong'}<strong
								>{part.value}</strong
							>{:else if part.kind === 'em'}<em>{part.value}</em
							>{:else if part.kind === 'code'}<code>{part.value}</code>{:else}{part.value}{/if}{/each}
					</li>
				{/each}
			</ul>
		{/if}
	{/each}
</div>

<style>
	.md > :first-child {
		margin-top: 0;
	}
	.md > :last-child {
		margin-bottom: 0;
	}
	.md :global(p) {
		margin: 0 0 0.75em;
		/* The models use a blank line to separate thoughts, but also a single newline
		   inside a paragraph to control wrapping. Collapsing that would flatten their
		   formatting, so intentional newlines are preserved. */
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}
	.md :global(strong) {
		font-weight: 600;
	}
	.md :global(code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.9em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: rgb(255 255 255 / 0.08);
	}
	.md :global(ol),
	.md :global(ul) {
		margin: 0.5em 0;
		padding-left: 1.4em;
	}
	.md :global(li) {
		margin: 0.25em 0;
	}
	.md :global(li)::marker {
		color: var(--color-accent, #e0a458);
	}
</style>
