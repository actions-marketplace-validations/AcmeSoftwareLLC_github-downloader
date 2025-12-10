import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { download, getFiles } from "./utils.js";

export async function run(): Promise<void> {
	try {
		const pat = getInput("git-pat");
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const outputDir = getInput("output-directory");
		const includes = getMultilineInput("includes");

		if (!includes.length) {
			throw new Error("No files specified in 'includes'.");
		}

		const options = pat ? { headers: { Authorization: `token ${pat}` } } : {};

		const downloads = includes.map(async (include: string) => {
			const [input, output] = include.split(":");
			if (!output) {
				throw new Error(
					`Invalid 'includes' format: "${include}". Expected format is "source:destination".`,
				);
			}
			const outputLocation = outputDir ? join(outputDir, output) : output;
			const url = `https://raw.githubusercontent.com/${repo}/${ref}/${input}`;

			await mkdir(dirname(outputLocation), { recursive: true });
			await download(url, options, outputLocation);

			console.log(`✅ Downloaded "${input}" → "${outputLocation}"`);
			return outputLocation;
		});

		const downloadedFiles = await Promise.all(downloads);

		const allFiles = outputDir ? await getFiles(outputDir) : downloadedFiles;

		await summary
			.addHeading("Download Summary")
			.addTable([
				[
					{ data: "Description", header: true },
					{ data: "Result", header: true },
				],
				["Repo", repo],
				["Ref", ref],
				["Downloaded Files", downloadedFiles.join("\n")],
				...(outputDir ? [["All Files in Output", allFiles.join("\n")]] : []),
			])
			.write();
	} catch (error: any) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
