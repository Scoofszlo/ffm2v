import { ZodError } from "zod";
import { argsParser } from "./cli/args_parser.ts";
import { print } from "./cli/printer.ts";
import { WorkflowSchema } from "./workflow/model/workflow.ts";
import { runEncode } from "./workflow/tasks/encode/index.ts";
import { runMerge } from "./workflow/tasks/merge/index.ts";
import { runUpdate } from "./workflow/tasks/update/index.ts";

try {
  const parsedArgs = argsParser.parseArgs();
  const workflow = WorkflowSchema.parse(parsedArgs);

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
    const firstIssue = error.issues[0]?.message ?? "Unknown issue detected";

    print(firstIssue, "error");
  } else {
    print(error as string, "error");
  }
}
