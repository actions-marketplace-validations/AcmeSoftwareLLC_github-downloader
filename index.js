import { getInput, getMultilineInput, setFailed, summary } from "@actions/core";
import { get } from "https";

try {
  const pat = getInput("git-pat");
  const repo = getInput("repo");
  const ref = getInput("ref");

  console.log(`pat: ${pat}`);
  console.log(`repo: ${repo}`);
  console.log(`ref: ${ref}`);

  const options = {
    headers: {},
  };

  if (pat) {
    options.headers = {
      Authorization: `token ${pat}`,
    };
  }

  getMultilineInput("includes").forEach((include) => {
    const [input, output] = include.split(":");

    const fileStream = fs.createWriteStream(output);

    get(
      `https://raw.githubusercontent.com/${org}/${ref}/${input}`,
      options,
      (res) => {
        res.pipe(fileStream);

        fileStream.on("end", () => {
          console.log(`Downloaded "${input}" to "${output}".`);
        });
      }
    ).on("error", (err) => {
      setFailed(err.message);
    });
  });

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
