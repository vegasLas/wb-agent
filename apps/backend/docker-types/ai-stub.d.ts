export declare type Tool = any;

export declare function tool<T>(config: {
  description?: string;
  inputSchema: { _output: T } | { _zod: { output: T } };
  execute?: (input: T, options?: any) => any;
  [key: string]: any;
}): any;

export declare function tool(config: {
  description?: string;
  inputSchema?: any;
  execute?: (input: any, options?: any) => any;
  [key: string]: any;
}): any;

export declare function streamText<TOOLS = any, OUTPUT = any>(...args: any[]): any;
export declare function convertToModelMessages(...args: any[]): any;
export declare type UIMessage = any;
export declare type CoreMessage = any;
