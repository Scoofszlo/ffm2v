/**
 * Collects FFmpeg filters into a single filterchain, with optional input and
 * output labels. Labels passed to the constructor are normalized to
 * `[label]` form, so callers pass bare stream names such as `0:v`.
 */
export class FilterchainHandler {
  filters: string[] = [];
  inputLabel?: string[] | undefined;
  outputLabel?: string[] | undefined;

  /**
   * Creates a filterchain, optionally with input and output labels.
   * @param options - Initial input and output labels, given as bare stream
   * names. Add filters with {@link addFilter}.
   */
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

  /**
   * Appends a filter to the chain.
   * @param filter - The filter string to append, e.g. `scale=1280:720`.
   */
  addFilter(filter: string): void {
    this.filters.push(filter);
  }

  /**
   * Appends an input label to the chain's input labels.
   * @param label - The bare label name, e.g. `0:v`.
   */
  addInputLabel(label: string): void {
    if (!this.inputLabel) {
      this.inputLabel = [];
    }
    this.inputLabel.push(`[${label}]`);
  }

  /**
   * Appends an output label to the chain's output labels.
   * @param label - The bare label name, e.g. `v0`.
   */
  addOutputLabel(label: string): void {
    if (!this.outputLabel) {
      this.outputLabel = [];
    }
    this.outputLabel.push(`[${label}]`);
  }

  /**
   * Gets the chain's input labels concatenated in insertion order.
   * @returns The input labels, e.g. `[v0][a0]`.
   * @throws Will throw an error if no input labels have been set.
   */
  getInputLabel(): string {
    if (!this.inputLabel) throw new Error("Input label is not set.");
    return this.inputLabel.join("");
  }

  /**
   * Gets the chain's output labels concatenated in insertion order.
   * @returns The output labels, e.g. `[outv][outa]`.
   * @throws Will throw an error if no output labels have been set.
   */
  getOutputLabel(): string {
    if (!this.outputLabel) throw new Error("Output label is not set.");
    return this.outputLabel.join("");
  }

  /**
   * Serializes the chain's filters as a comma-separated list, optionally
   * wrapped in its input and output labels.
   * @param options - Set `includeLabels` to `true` to prefix the input labels
   * and suffix the output labels.
   * @returns The filterchain string, e.g. `scale=1280:720,fps=60`.
   * @throws Will throw an error if the chain has no filters, or if
   * `includeLabels` is `true` and either label set is missing.
   */
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

  /**
   * Checks whether the chain has any filters.
   * @returns `true` if at least one filter has been added.
   */
  hasFilters(): boolean {
    return this.filters.length > 0;
  }

  /**
   * Wraps each bare label name in square brackets.
   * @param string - The bare label names to normalize.
   * @returns The normalized labels, or `undefined` when no labels are given.
   */
  private transformLabels(string?: string[] | undefined): string[] | undefined {
    if (!string) {
      return undefined;
    }

    return string.map((label) => `[${label}]`);
  }
}
