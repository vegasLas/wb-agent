export declare type Tool = any;

export declare function tool<SCHEMA, OUTPUT = any>(config: {
  description?: string;
  inputSchema?: SCHEMA;
  execute?: (input: SCHEMA extends { _zod: { output: infer O } } ? O : SCHEMA, options?: any) => any;
  [key: string]: any;
}): any;

export declare function streamText(...args: any[]): any;
export declare function convertToModelMessages(...args: any[]): any;
export declare type UIMessage = any;
export declare type CoreMessage = any;
