import chalk from "chalk";
import ora, { spinners, type Ora } from "ora";

export function spinnerPrint<T>(text: string, fn: (spinner: Ora) => T): T {
  const spinner = ora({ text, spinner: spinners.dots }).start();
  try {
    return fn(spinner);
  } finally {
    spinner.stop();
  }
}

export function print(message: string, type?: "success" | "error" | "warning") {
  if (!type) {
    console.log(message);
  }

  // Extract leading newlines from message to put them before the colored type label,
  // and remove them from the original message
  const newLineMatch = message.match(/^(\n+)/);
  const newLinePrefix = newLineMatch ? newLineMatch[1] : "";
  message = message.replace(/^\n+/, "");

  if (type === "success") {
    console.log(newLinePrefix + chalk.green("success") + ": " + message);
  } else if (type === "error") {
    console.error(newLinePrefix + chalk.red("error") + ": " + message);
  } else if (type === "warning") {
    console.warn(newLinePrefix + chalk.yellow("warning") + ": " + message);
  }
}
