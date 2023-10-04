import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { get } from "https";
import { createWriteStream, existsSync } from "fs";
import { readdir, mkdir } from "fs/promises";
import { dirname } from "path";

async function run() {
  try {
    const pat = getInput("git-pat");
    const repo = getInput("repo");
    const ref = getInput("ref");
    const outputDir = getInput("output-directory");

    const options = {
      headers: {},
    };

    if (pat) {
      options.headers = {
        Authorization: `token ${pat}`,
      };
    }

    for (const include of getMultilineInput("includes")) {
      const [input, output] = include.split(":");
      const outputLocation = outputDir ? `${outputDir}/${output}` : output;
      const url = `https://raw.githubusercontent.com/${repo}/${ref}/${input}`;

      const dir = dirname(outputLocation);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      const downloadLocation = await download(url, options, outputLocation);
      console.log(`Downloaded "${input}" to "${downloadLocation}".`);
    }

    console.log(
      `Downloaded Files: ${await readdir(outputDir, (recursive = true))}`
    );

    summary
      .addHeading("Summary")
      .addTable([
        [
          { data: "Description", header: true },
          { data: "Result", header: true },
        ],
        ["Repo", repo],
        ["Ref", ref],
      ])
      .write();
  } catch (error) {
    setFailed(error.message);
  }
}

async function download(url, options, output) {
  return new Promise((resolve, reject) => {
    const fileStream = createWriteStream(output);

    get(url, options, (res) => {
      res.pipe(fileStream);

      fileStream.on("finish", () => {
        resolve(output);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

run();
