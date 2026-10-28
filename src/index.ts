import fs from "fs";
import { ZodError } from "zod";
import { argsParser } from "./cli/argsParser.ts";
import { print } from "./cli/printer.ts";
import { createTmpDir } from "./util.ts";
import { WorkflowSchema } from "./workflow/model/workflow.ts";
import { runEncode } from "./workflow/tasks/encode/index.ts";
import { runMerge } from "./workflow/tasks/merge/index.ts";
import { runUpdate } from "./workflow/tasks/update/index.ts";

const tmpDir = createTmpDir();

try {
  const parsedArgs = argsParser.parseArgs();
  const workflow = WorkflowSchema.parse({ ...parsedArgs, tmpDir });

  if (workflow.type === "update") {
    runUpdate(workflow);
  } else if (workflow.type === "encode") {
    runEncode(workflow);
  } else if (workflow.type === "merge") {
    runMerge(workflow);
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
