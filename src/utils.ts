import { createWriteStream, type Dirent } from "fs";
import { readdir } from "fs/promises";
import { get } from "https";
import { join } from "path";

async function download(
	url: string,
	options: any,
	output: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const fileStream = createWriteStream(output);
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

export { download, getFiles };
