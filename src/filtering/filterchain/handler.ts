export class FilterchainHandler {
  filters: string[] = [];
  inputLabel?: string[] | undefined;
  outputLabel?: string[] | undefined;

  constructor({
    inputLabel,
    outputLabel,
  }: {
    inputLabel?: string[];
    outputLabel?: string[];
    filters?: string[];
  } = {}) {
    this.inputLabel = this.transformLabels(inputLabel);
    this.outputLabel = this.transformLabels(outputLabel);
  }

  addFilter(filter: string): void {
    this.filters.push(filter);
  }

  addInputLabel(label: string): void {
    if (!this.inputLabel) {
      this.inputLabel = [];
    }
    this.inputLabel.push(`[${label}]`);
  }

  addOutputLabel(label: string): void {
    if (!this.outputLabel) {
      this.outputLabel = [];
    }
    this.outputLabel.push(`[${label}]`);
  }

  getInputLabel(): string {
    if (!this.inputLabel) throw new Error("Input label is not set.");
    return this.inputLabel.join("");
  }

  getOutputLabel(): string {
    if (!this.outputLabel) throw new Error("Output label is not set.");
    return this.outputLabel.join("");
  }

  getFilters({
    includeLabels = false,
  }: { includeLabels?: boolean } = {}): string {
    if (this.filters.length === 0) {
      throw new Error("No filters have been added to the filterchain.");
    }

    if (includeLabels) {
      if (!this.inputLabel || !this.outputLabel) {
        throw new Error(
          "Input and output labels must be set when includeLabels is true.",
        );
      }
      return `${this.getInputLabel()}${this.filters.join(",")}${this.getOutputLabel()}`;
    }

    return `${this.filters.join(",")}`;
  }

  hasFilters(): boolean {
    return this.filters.length > 0;
  }

  private transformLabels(string?: string[] | undefined): string[] | undefined {
    if (!string) {
      return undefined;
    }

    return string.map((label) => `[${label}]`);
  }
}
