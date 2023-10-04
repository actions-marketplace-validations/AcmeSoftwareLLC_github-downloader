import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { get } from "https";
import { createWriteStream } from "fs";

async function run() {
  try {
    const pat = getInput("git-pat");
    const repo = getInput("repo");
    const ref = getInput("ref");
    const outputDir = getInput("output-directory");

    console.log(`pat: ${pat}`);
    console.log(`repo: ${repo}`);
    console.log(`ref: ${ref}`);
    console.log(`outputDir: ${outputDir}`);

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

      await download(url, options, outputLocation);
    }

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

      fileStream.on("end", () => {
        console.log(`Downloaded "${input}" to "${output}".`);
        resolve(output);
      });
    }).on("error", (err) => {
      setFailed(err.message);
    });
  });
}

run();
