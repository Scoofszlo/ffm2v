import path from "path";

/**
 * Escapes a path for use in FFmpeg filter options.
 *
 * Step 1: Resolve the path to an absolute path using `path.resolve()`. Step 2:
 * Replace backslashes (`\`) with forward slashes (`/`) for FFmpeg
 * compatibility. Step 3: Escape colons (`:`) and single quotes (`'`) by
 * prefixing them with a double backslash (`\\`).
 *
 * @param p The path to escape.
 * @returns The escaped path.
 */
export function escapeFilterPath(p: string): string {
  return path
    .resolve(p) // Resolve the path to an absolute path
    .replace(/\\/g, "/") // Replace backslashes with forward slashes for FFmpeg compatibility
    .replace(/[:']/g, (c) => `\\\\${c}`); // Escape colons and single quotes by prefixing them with a double backslash
}
