import { createWriteStream, type Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { get, type RequestOptions } from "node:https";
import { join } from "node:path";

export type FileMapping = [string, string];

async function download(
	url: string,
	options: RequestOptions,
	outputPath: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const fileStream = createWriteStream(outputPath);
		fileStream.on("error", reject);

		const req = get(url, options, (res) => {
			if (res.statusCode && res.statusCode >= 400) {
				res.resume();
				return reject(
					new Error(`Failed to download ${url} (status ${res.statusCode})`),
				);
			}

			res.pipe(fileStream);

			fileStream.on("finish", () => {
				fileStream.close((err) => {
					if (err) {
						return reject(err);
					}
					resolve();
				});
			});
		});

		req.on("error", reject);

		req.setTimeout(15000, () => {
			req.destroy(new Error(`Request timed out for ${url}`));
		});
	});
}

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

export { download, getFiles, parseMappings, logFileDownload };
