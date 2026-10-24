import fs from "fs";
import os from "os";
import path from "path";

/**
 * Creates a temporary directory in the system's default temp location and
 * returns its path. The directory will have a unique name starting with
 * "ffm2v-".
 */
export function createTmpDir() {
  const prefix = "ffm2v-";
  const finalPath = path.join(os.tmpdir(), prefix);
  return fs.mkdtempSync(finalPath);
}
