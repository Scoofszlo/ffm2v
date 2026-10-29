/**
 * Collects filterchains into a single FFmpeg filtergraph, joining them with
 * `;`.
 */
export class FiltergraphHandler {
  filterchains: string[] = [];

  /**
   * Appends a filterchain to the graph.
   * @param filterchain - The filterchain to append, with or without labels.
   */
  addFilterchain(filterchain: string): void {
    this.filterchains.push(filterchain);
  }

  /**
   * Serializes all filterchains into a single `;`-separated filtergraph.
   * @returns The filtergraph string.
   * @throws Will throw an error if no filterchains have been added.
   */
  getFiltergraph(): string {
    if (this.filterchains.length === 0) {
      throw new Error("No filterchains have been added to the filtergraph.");
    }

    return this.filterchains.join(";");
  }
}
