import { ArgsHandler } from "./cli/args_handler.ts";
import { print } from "./cli/printer.ts";
import { runEncode } from "./workflow/encode/index.ts";
import { runMerge } from "./workflow/merge/index.ts";
import { runUpdate } from "./workflow/update/index.ts";

const argsHandler = new ArgsHandler();
const parsed = argsHandler.parse(process.argv);

if (!parsed) {
  print("Failed to parse arguments.", "error");
  process.exit(1);
} else if (parsed.command === "update") {
  runUpdate(parsed.options);
} else if (parsed.command === "encode") {
  runEncode(parsed.options);
} else if (parsed.command === "merge") {
  runMerge(parsed.options);
}
