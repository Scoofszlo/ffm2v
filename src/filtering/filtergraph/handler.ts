export class FiltergraphHandler {
  filterchains: string[] = [];

  addFilterchain(filterchain: string): void {
    this.filterchains.push(filterchain);
  }

  getFiltergraph(): string {
    if (this.filterchains.length === 0) {
      throw new Error("No filterchains have been added to the filtergraph.");
    }

    return this.filterchains.join(";");
  }
}
