import fs from "fs";
import { ZodError } from "zod";
import { argsParser } from "./cli/argsParser";
import { print } from "./cli/printer";
import { createTmpDir } from "./util";
import { WorkflowSchema } from "./workflow/model/workflow";
import { runEncode } from "./workflow/tasks/encode/index";
import { runMerge } from "./workflow/tasks/merge/index";
import { runUpdate } from "./workflow/tasks/update/index";
import { checkDeps } from "./workflow/util";

const tmpDir = createTmpDir();

try {
  checkDeps(["ffmpeg"]);
  const parsedArgs = argsParser.parseArgs();
  const workflow = WorkflowSchema.parse({ ...parsedArgs, tmpDir });

  if (workflow.type === "update") {
    checkDeps(["7z"]);
    runUpdate(workflow);
  } else if (workflow.type === "encode" || workflow.type === "merge") {
    const opts = workflow.options;

    // A custom video2x path is validated by resolveProgramExecutable() when the
    // pipeline is built, so only require video2x on PATH when none is given.
    if (!opts.video2xPath && opts.interpolationMode === "video2x") {
      checkDeps(["video2x"]);
    }

    if (workflow.type === "encode") {
      await runEncode(workflow);
    } else {
      await runMerge(workflow);
    }
  }
} catch (error) {
  if (error instanceof ZodError) {
    // Print the first issue instead of all issues to avoid overwhelming the
    // user with too much errors
    const firstIssue = error.issues[0]?.message ?? "Unknown issue caught";

    print(firstIssue, "error");
  } else if (error instanceof Error) {
    print(`${error.message}`, "error");
  } else {
    print(`${error}`, "error");
  }

  process.exit(1);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
