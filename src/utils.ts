import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export type FileMapping = [string, string];

async function getFiles(directory: string): Promise<string[]> {
	const dirents: Dirent[] = (await readdir(directory, {
		recursive: true,
		withFileTypes: true,
	})) as unknown as Dirent[];
	return dirents
		.filter((dirent) => dirent.isFile())
		.map((dirent) => join(directory, dirent.name));
}

async function parseMappings(mappings: string[]): Promise<FileMapping[]> {
	const mappingStr = mappings.join("");
	return Object.entries(JSON.parse(mappingStr));
}

async function logFileDownload(
	input: string,
	outputPath: string,
): Promise<void> {
	const { size } = await stat(outputPath);
	const sizeStr =
		size < 1024 ? `${size} bytes` : `${(size / 1024).toFixed(2)} KB`;
	console.log(
		`\n📥 File Downloaded!\n` +
			`   • Source:      \x1b[36m${input}\x1b[0m\n` +
			`   • Saved as:    \x1b[32m${outputPath}\x1b[0m\n` +
			`   • Size:        \x1b[33m${sizeStr}\x1b[0m\n` +
			`----------------------------------------`,
	);
}

export { getFiles, logFileDownload, parseMappings };
