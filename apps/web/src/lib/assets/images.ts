// Resolves world/trainer illustrations that editors drop into src/lib/assets/{worlds,trainers}/.
// Everything here is optional: until real (or AI-generated) art exists for a given
// slug, callers fall back to a CSS gradient placeholder, so the UI never breaks.

const worldImages = import.meta.glob('/src/lib/assets/worlds/*.{jpg,jpeg,png,webp}', {
	eager: true,
	import: 'default'
}) as Record<string, string>;

const trainerImages = import.meta.glob('/src/lib/assets/trainers/*.{jpg,jpeg,png,webp}', {
	eager: true,
	import: 'default'
}) as Record<string, string>;

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function lookup(map: Record<string, string>, dir: string, key: string): string | undefined {
	for (const ext of EXTENSIONS) {
		const match = map[`/src/lib/assets/${dir}/${key}.${ext}`];
		if (match) return match;
	}
	return undefined;
}

export function getWorldImage(imageKey: string): string | undefined {
	return lookup(worldImages, 'worlds', imageKey);
}

export function getTrainerImage(imageKey: string): string | undefined {
	return lookup(trainerImages, 'trainers', imageKey);
}
