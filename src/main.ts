import { mkdir } from "node:fs/promises";
import type { RequestOptions } from "node:https";
import { dirname, join } from "node:path";
import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import {
	download,
	type FileMapping,
	getFiles,
	parseMappings,
} from "./utils.js";

export async function run(): Promise<void> {
	try {
		const repo = getInput("repo", { required: true });
		const ref = getInput("ref") || "main";
		const pat = getInput("git-pat");
		const outputDir = getInput("output-directory");
		const options: RequestOptions = pat
			? { headers: { Authorization: `token ${pat}` } }
			: {};

		const mappings = await parseMappings(getMultilineInput("mappings"));
		const props = { repo, ref, options, outputDir };

		const downloadedFiles = await downloadMappedFiles(mappings, props);

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
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}

interface DownloadProps {
	repo: string;
	ref: string;
	options: RequestOptions;
	outputDir: string;
}

async function downloadMappedFiles(
	mappings: FileMapping[],
	{ repo, ref, options, outputDir }: DownloadProps,
): Promise<string[]> {
	async function downloadSingleFile(mapping: FileMapping): Promise<string> {
		const [input, output] = mapping;
		const outputLocation = outputDir ? join(outputDir, output) : output;
		const url = `https://raw.githubusercontent.com/${repo}/${ref}/${input}`;

		await mkdir(dirname(outputLocation), { recursive: true });
		await download(url, options, outputLocation);

		console.log(`✅ Downloaded "${input}" → "${outputLocation}"`);
		return outputLocation;
	}

	return Promise.all(mappings.map(downloadSingleFile));
}
