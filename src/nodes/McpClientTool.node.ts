import {
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodePropertyOptions,
	type ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/* -------------------------
   Types
   ------------------------- */
interface MCPPayload {
	name: string;
	description?: string;
	inputSchema?: IDataObject;
	'x-props': {
		method: string;
		path: string;
		operationId?: string;
		tag?: string;
		deprecated?: boolean;
		summary?: string;
	};
}

interface MCPToolsResponse {
	tools: MCPPayload[];
}

/* -------------------------
   Helper Functions
   ------------------------- */
/**
 * Extract base URL and MCP path from endpoint
 */
function parseEndpoint(endpoint: string): { baseUrl: string; mcpPath: string } {
	const trimmed = endpoint.trim().replace(/\/+$/, '');
	
	const url = new URL(trimmed);
	const pathname = url.pathname;
	
	if (pathname && pathname !== '/') {
		return {
			baseUrl: `${url.protocol}//${url.host}`,
			mcpPath: pathname
		};
	}
	
	return {
		baseUrl: trimmed,
		mcpPath: ''
	};
}

/**
 * ✅ NEW: Enhance tool description with explicit parameter names and examples
 */
function enhanceToolDescription(tool: MCPPayload): string {
	let desc = tool.description || tool['x-props'].summary || '';
	
	// Add method and path info
	desc += `\n\n**Endpoint**: ${tool['x-props'].method} ${tool['x-props'].path}`;
	
	// ✅ CRITICAL: Add explicit parameter requirements
	if (tool.inputSchema?.properties) {
		const props = tool.inputSchema.properties as IDataObject;
		const required = (tool.inputSchema.required as string[]) || [];
		
		desc += '\n\n**Required Parameters (EXACT names must be used)**:';
		
		const propEntries = Object.entries(props);
		
		// List required fields first
		const requiredFields = propEntries.filter(([key]) => required.includes(key));
		const optionalFields = propEntries.filter(([key]) => !required.includes(key));
		
		if (requiredFields.length > 0) {
			requiredFields.forEach(([key, value]: [string, any]) => {
				const type = value.type || 'string';
				const valueDesc = value.description || '';
				const example = value.example || value.examples?.[0];
				
				desc += `\n  • \`${key}\` (${type}, REQUIRED)`;
				if (valueDesc) desc += ` - ${valueDesc}`;
				if (example) desc += ` [Example: ${JSON.stringify(example)}]`;
			});
		}
		
		if (optionalFields.length > 0) {
			desc += '\n\n**Optional Parameters**:';
			optionalFields.forEach(([key, value]: [string, any]) => {
				const type = value.type || 'string';
				const valueDesc = value.description || '';
				const example = value.example || value.examples?.[0];
				
				desc += `\n  • \`${key}\` (${type}, optional)`;
				if (valueDesc) desc += ` - ${valueDesc}`;
				if (example) desc += ` [Example: ${JSON.stringify(example)}]`;
			});
		}
		
		// ✅ Add critical note
		desc += '\n\n⚠️ **IMPORTANT**: You MUST use the EXACT parameter names shown above. Do not abbreviate or translate them.';
	}
	
	return desc;
}

/**
 * ✅ NEW: Add example to schema for better AI understanding
 */
function enhanceInputSchema(schema: IDataObject): IDataObject {
	if (!schema?.properties) return schema;
	
	const enhanced = { ...schema };
	const props = enhanced.properties as IDataObject;
	const required = (enhanced.required as string[]) || [];
	
	// Build example object
	const exampleObj: IDataObject = {};
	
	for (const [key, value] of Object.entries(props)) {
		const prop = value as any;
		
		if (prop.example !== undefined) {
			exampleObj[key] = prop.example;
		} else if (prop.examples && Array.isArray(prop.examples) && prop.examples.length > 0) {
			exampleObj[key] = prop.examples[0];
		} else if (prop.default !== undefined) {
			exampleObj[key] = prop.default;
		} else {
			// Generate example based on type
			switch (prop.type) {
				case 'string':
					exampleObj[key] = `example_${key}`;
					break;
				case 'number':
				case 'integer':
					exampleObj[key] = 123;
					break;
				case 'boolean':
					exampleObj[key] = true;
					break;
				case 'array':
					exampleObj[key] = [];
					break;
				case 'object':
					exampleObj[key] = {};
					break;
				default:
					exampleObj[key] = `value_for_${key}`;
			}
		}
	}
	
	// Add example to schema root
	enhanced.example = exampleObj;
	
	// Add title to each property emphasizing exact naming
	for (const [key, value] of Object.entries(props)) {
		const prop = value as any;
		if (!prop.title) {
			prop.title = `Parameter: ${key}`;
		}
		// Add explicit note about exact naming
		if (prop.description) {
			prop.description = `${prop.description}\n(Use exact name: "${key}")`;
		} else {
			prop.description = `Use exact parameter name: "${key}"`;
		}
	}
	
	return enhanced;
}

/* -------------------------
   Node Implementation
   ------------------------- */
export class McpClientTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Client Tool',
		name: 'mcpClientTool',
		icon: 'file:icon.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		description:
			'Dynamically executes tools from an MCP server based on AI agent input. Fetches tool metadata from /tools and provides dynamic tool definitions for agents.',
		defaults: { name: 'MCP Client' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'mcptool', required: false }],
		properties: [
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: 'http://localhost:3000/mcp',
				required: true,
				description: 'MCP server endpoint. Can include path (e.g., /mcp) for metadata endpoints.',
			},
			{
				displayName: 'Server Transport',
				name: 'transport',
				type: 'options',
				options: [
					{ name: 'HTTP (Streamable)', value: 'http' },
					{ name: 'Server Sent Events (Deprecated)', value: 'sse' },
				],
				default: 'http',
			},
			{
				displayName: 'Tools to Include',
				name: 'toolSelection',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Selected', value: 'selected' },
					{ name: 'All Except', value: 'except' },
				],
				default: 'all',
			},
			{
				displayName: 'Selected Tools',
				name: 'selectedTools',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getMcpTools',
				},
				default: [],
				displayOptions: {
					show: {
						toolSelection: ['selected', 'except'],
					},
				},
			},
			{
				displayName: 'Strict Parameter Validation',
				name: 'strictValidation',
				type: 'boolean',
				default: true,
				description: 'Whether to validate that all required parameters are provided with exact names',
			},
		],
	};

	methods = {
		loadOptions: {
			async getMcpTools(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = this.getNodeParameter('endpoint', 0) as string;
				const { baseUrl, mcpPath } = parseEndpoint(endpoint);

				let authHeader: any = '';
				try {
					const credentials = await this.getCredentials('mcptool');
					if (credentials?.authHeader) authHeader = credentials.authHeader;
				} catch {}

				const toolsUrl = `${baseUrl}${mcpPath}/tools`;

				const requestOptions: OptionsWithUri = {
					method: 'GET',
					uri: toolsUrl,
					json: true,
					headers: authHeader ? { Authorization: authHeader } : {},
					timeout: 15000,
				};

				let toolsRes: MCPToolsResponse;
				try {
					toolsRes = await (this as any).helpers.request(requestOptions);
				} catch (err) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to fetch MCP tools from ${toolsUrl}: ${(err as Error).message}`,
					);
				}

				if (!toolsRes?.tools) {
					throw new NodeOperationError(this.getNode(), 'Invalid MCP /tools response');
				}

				return toolsRes.tools.map((tool) => ({
					name: `${tool.name} — ${tool.description || tool['x-props'].summary || ''}`,
					value: tool.name,
				}));
			},
		},

		loadMethods: {
			async getAiToolDefinitions(this: any) {
				const endpoint = this.getNodeParameter?.('endpoint', 0) as string;
				if (!endpoint) return [];

				const { baseUrl, mcpPath } = parseEndpoint(endpoint);

				let authHeader = '';
				try {
					const credentials = await this.getCredentials?.('mcptool');
					if (credentials?.authHeader) authHeader = credentials.authHeader;
				} catch {}

				const toolsUrl = `${baseUrl}${mcpPath}/tools`;

				let toolsRes: MCPToolsResponse;
				try {
					toolsRes = await (this as any).helpers.request({
						method: 'GET',
						uri: toolsUrl,
						json: true,
						headers: authHeader ? { Authorization: authHeader } : {},
						timeout: 15000,
					});
				} catch {
					return [];
				}

				if (!Array.isArray(toolsRes?.tools)) return [];

				const mode = this.getNodeParameter?.('toolSelection', 0) as string;
				const selected = this.getNodeParameter?.('selectedTools', 0) as string[];

				const filtered = toolsRes.tools.filter((t) => {
					if (mode === 'all') return true;
					if (mode === 'selected') return selected.includes(t.name);
					if (mode === 'except') return !selected.includes(t.name);
					return true;
				});

				// ✅ ENHANCED: Add detailed descriptions and examples
				return filtered.map((t) => {
					const enhancedSchema = enhanceInputSchema(
						t.inputSchema && typeof t.inputSchema === 'object'
							? t.inputSchema
							: { type: 'object', properties: {} }
					);
					
					return {
						name: t.name,
						description: enhanceToolDescription(t),
						parameters: enhancedSchema,
						__meta: { ...t['x-props'] },
					};
				});
			},
		},
	};

	async execute(this: any): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const output: INodeExecutionData[] = [];

		const endpoint = this.getNodeParameter('endpoint', 0) as string;
		const strictValidation = this.getNodeParameter('strictValidation', 0, true) as boolean;
		const { baseUrl, mcpPath } = parseEndpoint(endpoint);

		let authHeader = '';
		try {
			const credentials = await this.getCredentials('mcptool');
			if (credentials?.authHeader) authHeader = credentials.authHeader;
		} catch {}

		const toolsUrl = `${baseUrl}${mcpPath}/tools`;

		let toolsRes: MCPToolsResponse;
		try {
			toolsRes = await this.helpers.request({
				method: 'GET',
				uri: toolsUrl,
				json: true,
				headers: authHeader ? { Authorization: authHeader } : {},
				timeout: 15000,
			});
		} catch (err) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to fetch MCP tools during execution from ${toolsUrl}: ${(err as Error).message}`,
			);
		}

		if (!toolsRes?.tools) {
			throw new NodeOperationError(this.getNode(), 'Invalid tools list from MCP server');
		}

		const toolMap = new Map<string, MCPPayload>();
		for (const t of toolsRes.tools) toolMap.set(t.name, t);

		for (const item of items) {
			try {
				const json = item.json || {};

				const toolName = json.tool || json.toolName || json.tool_name || null;

				if (!toolName) {
					throw new NodeOperationError(
						this.getNode(),
						`Missing "tool" field in input JSON. Expected { "tool": "<name>", "arguments": { ... } }`,
					);
				}

				const tool = toolMap.get(toolName);
				if (!tool) {
					throw new NodeOperationError(
						this.getNode(),
						`Tool "${toolName}" not found. Available: ${[...toolMap.keys()].join(', ')}`,
					);
				}

				let args: IDataObject = json.arguments || json.args || json.parameters || {};

				// ✅ NEW: Validate required parameters if strict mode enabled
				if (strictValidation && tool.inputSchema?.required) {
					const required = tool.inputSchema.required as string[];
					const missing = required.filter(key => !(key in args));
					
					if (missing.length > 0) {
						const schema = tool.inputSchema.properties as IDataObject;
						const details = missing.map(key => {
							const prop = schema[key] as any;
							const type = prop?.type || 'unknown';
							const desc = prop?.description || 'No description';
							return `  • ${key} (${type}): ${desc}`;
						}).join('\n');
						
						throw new NodeOperationError(
							this.getNode(),
							`Missing required parameters for tool "${toolName}":\n${details}\n\nProvided: ${JSON.stringify(Object.keys(args))}\nRequired: ${JSON.stringify(required)}`,
						);
					}
				}

				// ✅ NEW: Log parameter mapping for debugging
				if (tool.inputSchema?.properties) {
					const expected = Object.keys(tool.inputSchema.properties);
					const provided = Object.keys(args);
					const unexpected = provided.filter(k => !expected.includes(k));
					
					if (unexpected.length > 0) {
						console.warn(
							`Tool "${toolName}" received unexpected parameters: ${unexpected.join(', ')}. ` +
							`Expected: ${expected.join(', ')}`
						);
					}
				}

				const method = (tool['x-props'].method || 'GET').toUpperCase();
				let path = tool['x-props'].path || '/';

				if (!path.startsWith('/')) path = `/${path}`;

				const url = `${baseUrl}${path}`;

				const req: OptionsWithUri = {
					method,
					uri: url,
					json: true,
					headers: authHeader ? { Authorization: authHeader } : {},
					timeout: 20000,
				};

				if (method === 'GET' || method === 'DELETE') {
					req.qs = args;
				} else {
					req.body = args;
				}

				let response: any;
				try {
					response = await this.helpers.request(req);
				} catch (err: any) {
					// ✅ ENHANCED: Better error messages
					let errorMsg = `Error calling tool "${toolName}" at ${url}: ${err.message || err}`;
					
					if (err.statusCode === 400) {
						errorMsg += `\n\nThis might be due to incorrect parameter names or types.`;
						errorMsg += `\nProvided parameters: ${JSON.stringify(args, null, 2)}`;
						if (tool.inputSchema?.properties) {
							errorMsg += `\nExpected parameters: ${JSON.stringify(Object.keys(tool.inputSchema.properties))}`;
						}
					}
					
					throw new NodeOperationError(this.getNode(), errorMsg);
				}

				output.push({
					json: {
						error: false,
						tool: toolName,
						method,
						path,
						url,
						response,
					},
				});
			} catch (error) {
				output.push({
					json: {
						error: true,
						message: (error as Error).message,
						input: item.json,
					},
				});
			}
		}

		return [output];
	}
}