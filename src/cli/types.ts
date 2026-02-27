import type { Params } from "../types.ts";

export type CommonOptions = Params & {
  output?: string;
};

export type EncodeOptions = CommonOptions & {
  input: string;
};

export type MergeOptions = CommonOptions & {
  input: string[];
};

export type UpdateOptions = {
  disableArchive: boolean;
  checkOnly: boolean;
};

export type ParsedArgs =
  | { command: "encode"; options: EncodeOptions }
  | { command: "merge"; options: MergeOptions }
  | { command: "update"; options: UpdateOptions };

export type CLIOptions = Params & {
  output: string;
};

export type CommonCLIOption<K extends keyof CLIOptions> = {
  name: K;
  options: {
    flags: string;
    description: string;
    default?: CLIOptions[K] | null; 
    choices?: string[];
  };
  validation?: (value: any) => CLIOptions[K]; 
};
