import fs from 'fs/promises';
import path from 'path';
import _ from 'lodash';
import { execSync } from 'child_process';

const NAMESPACE = process.env.NAMESPACE
const OPENAPI_URL = process.env.OPENAPI_URL

if (!NAMESPACE || !OPENAPI_URL) {
    throw new Error('NAMESPACE and OPENAPI_URL are required')
}

const namespaceCase = _.startCase(_.camelCase(NAMESPACE)).replace(/ /g, '');
const OUT_DIR = path.join('src', 'nodes');
const OUT_FILE = path.join(OUT_DIR, `${namespaceCase}.node.ts`);
const CREDENTIAL_NAME = _.camelCase(NAMESPACE);

interface OpenAPI {
    paths: Record<string, any>;
    components?: any;
    tags?: { name: string }[];
}

// helpers
const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');

// load OpenAPI
async function loadOpenAPI(): Promise<OpenAPI> {
    const url = OPENAPI_URL!
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch OpenAPI: ${res.status} ${res.statusText}`);
    return res.json() as Promise<OpenAPI>;
}

// convert operation to value
function operationValue(tag: string, operationId: string) {
    return _.snakeCase(`${tag}_${operationId}`);
}

// build properties for dropdown + dynamic inputs
function buildPropertiesBlock(ops: Array<any>) {
    const options = ops.map((op) => {
        const value = operationValue(op.tag, op.operationId);
        const label = `${op.tag} ${_.kebabCase(op.operationId).replace(/-/g, ' ')}`;
        return `{ name: '${label}', value: '${value}', description: ${JSON.stringify(
            op.summary || op.description || '',
        )}, action: '${label}' }`;
    });

    const dropdown = `
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      options: [
        ${options.join(',\n        ')}
      ],
      default: '${operationValue(ops[0].tag, ops[0].operationId).replace(/_/g, ' ')}',
      description: 'Pilih endpoint yang akan dipanggil'
    }
  `;

    const dynamicProps: string[] = [];

    for (const op of ops) {
        const value = operationValue(op.tag, op.operationId);

        // Query fields
        for (const name of op.query ?? []) {
            dynamicProps.push(`
      {
        displayName: 'Query ${name}',
        name: 'query_${name}',
        type: 'string',
        default: '',
        placeholder: '${name}',
        description: '${name}',
        displayOptions: { show: { operation: ['${value}'] , "@tool": [true]} }
      }`);
        }

        // Body fields (required only)
        const bodyRequired = op.body?.required ?? [];
        const bodySchema = op.body?.schema ?? {};

        for (const name of bodyRequired) {
            const schema = bodySchema[name] ?? {};
            let type = 'string';
            if (schema.type === 'number' || schema.type === 'integer') type = 'number';
            if (schema.type === 'boolean') type = 'boolean';

            const defVal =
                type === 'string' ? "''" : type === 'number' ? '0' : type === 'boolean' ? 'false' : "''";

            dynamicProps.push(`
      {
        displayName: 'Body ${name}',
        name: 'body_${name}',
        type: '${type}',
        default: ${defVal},
        placeholder: '${name}',
        description: '${schema?.description ?? name}',
        displayOptions: { show: { operation: ['${value}'], "@tool": [true] } }
      }`);
        }
    }

    return `[
    ${dropdown},
    ${dynamicProps.join(',\n    ')}
  ]`;
}

// build execute switch
function buildExecuteSwitch(ops: Array<any>) {
    const cases: string[] = [];

    for (const op of ops) {
        const val = operationValue(op.tag, op.operationId);
        const method = (op.method || 'get').toLowerCase();
        const url = op.path;
        const q = op.query ?? [];
        const bodyReq = op.body?.required ?? [];

        const qLines =
            q
                .map(
                    (name: string) =>
                        `const query_${_.snakeCase(name)} = this.getNodeParameter('query_${_.snakeCase(name)}', i, '') as string;`,
                )
                .join('\n          ') || '';

        const bodyLines =
            bodyReq
                .map(
                    (name: string) =>
                        `const body_${_.snakeCase(name)} = this.getNodeParameter('body_${_.snakeCase(name)}', i, '') as any;`,
                )
                .join('\n          ') || '';

        const bodyObject =
            bodyReq.length > 0
                ? `const body = { ${bodyReq.map((n: string) => `${_.snakeCase(n)}: body_${_.snakeCase(n)}`).join(', ')} };`
                : 'const body = undefined;';

        const paramsObj =
            q.length > 0 ? `params: { ${q.map((n: string) => `${_.snakeCase(n)}: query_${_.snakeCase(n)}`).join(', ')} },` : '';

        const dataLine = method === 'get' ? '' : 'data: body,';

        cases.push(`
      case '${val}': {
          ${qLines}
          ${bodyLines}
          ${bodyObject}
          url = baseUrl + '${url}';
          method = '${method}';
          axiosConfig = {
            headers: finalHeaders,
            ${paramsObj}
            ${dataLine}
          };
          break;
      }
    `);
    }

    return `
    switch (operation) {
      ${cases.join('\n')}
      default:
        throw new Error('Unknown operation: ' + operation);
    }
  `;
}

function credentialsText() {
    const text = `
  import { ICredentialType, INodeProperties } from "n8n-workflow";

export class ${namespaceCase}Credentials implements ICredentialType {
    name = "${CREDENTIAL_NAME}";
    displayName = "${CREDENTIAL_NAME} (Bearer Token)";

    properties: INodeProperties[] = [
        {
            displayName: "Base URL",
            name: "baseUrl",
            type: "string",
            default: "",
            placeholder: "https://api.example.com",
            description: "Masukkan URL dasar API tanpa garis miring di akhir",
            required: true,
        },
        {
            displayName: "Bearer Token",
            name: "token",
            type: "string",
            default: "",
            typeOptions: { password: true },
            description: "Masukkan token autentikasi Bearer (tanpa 'Bearer ' di depannya)",
            required: true,
        },
    ];
}

  `

    return text
}

// top-level
function generateNodeFile(ops: Array<any>) {
    const propertiesBlock = buildPropertiesBlock(ops);
    const executeSwitch = buildExecuteSwitch(ops);

    return `import type { INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
import axios from 'axios';

export class ${namespaceCase} implements INodeType {
  description: INodeTypeDescription = {
    displayName: '${NAMESPACE}',
    name: '${namespaceCase}',
    icon: 'file:icon.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Universal node generated from OpenAPI - satu node memuat semua endpoint',
    defaults: { name: '${namespaceCase}' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      { name: '${CREDENTIAL_NAME}', required: true }
    ],
    properties: ${propertiesBlock}
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: any[] = [];
    const creds = await this.getCredentials('${CREDENTIAL_NAME}') as any;

    const baseUrlRaw = creds?.baseUrl ?? '';
    const apiKeyRaw = creds?.token ?? '';
    const baseUrl = String(baseUrlRaw || '').replace(/\\/$/, '');
    const apiKey = String(apiKeyRaw || '').trim().replace(/^Bearer\\s+/i, '');

    if (!baseUrl) throw new Error('Base URL tidak ditemukan');
    if (!apiKey) throw new Error('Token tidak ditemukan');

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;

      let url = '';
      let method: any = 'get';
      let axiosConfig: any = {};
      const finalHeaders: any = { Authorization: \`Bearer \${apiKey}\` };

      ${executeSwitch}

      try {
        const response = await axios({ method, url, ...axiosConfig });
        returnData.push(response.data);
      } catch (err: any) {
        returnData.push({
          error: true,
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}

`;
}

function iconText(text: string) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" aria-label="Icon AB square">
<defs>
  <style>
    .letters { 
      fill: #3b82f6; /* biru */ 
      font-family: "Inter", "Segoe UI", Roboto, sans-serif; 
      font-weight: 800; 
      font-size: 56px; 
    }
  </style>
</defs>

<text class="letters" x="64" y="78" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>
    
    `
}

function packageText({ name, className }: { name: string, className: string }) {
    return `
    {
  "name": "n8n-nodes-${name}",
  "version": "1.0.43",
  "keywords": [
    "n8n",
    "n8n-nodes"
  ],
  "author": {
    "name": "makuro",
    "phone": "6289697338821"
  },
  "license": "ISC",
  "description": "",
  "n8n": {
    "nodes": [
      "nodes/${className}.node.js"
    ],
    "n8nNodesApiVersion": 1,
    "credentials": [
      "credentials/${className}Credentials.credentials.js"
    ]
  }
}`

}

async function run() {

    await fs.rm('src', { recursive: true }).catch(() => { })
    await fs.mkdir('src/credentials', { recursive: true })
    await fs.mkdir('src/nodes', { recursive: true })

    console.log('💡 Loading OpenAPI...');
    const api = await loadOpenAPI();

    const ops: Array<any> = [];

    for (const pathStr of Object.keys(api.paths || {})) {
        const pathObj = api.paths[pathStr];

        for (const method of Object.keys(pathObj)) {
            const operation = pathObj[method];
            const tags = operation.tags?.length ? operation.tags : ['default'];

            console.log("✅", _.upperCase(method).padEnd(7), pathStr);

            const operationId = operation.operationId || `${method}_${safe(pathStr)}`;
            const query = (operation.parameters ?? [])
                .filter((p: any) => p.in === 'query')
                .map((p: any) => p.name);

            const requestBody =
                operation.requestBody?.content?.['application/json']?.schema ??
                operation.requestBody?.content?.['multipart/form-data']?.schema ??
                null;

            const bodyRequired = requestBody?.required ?? [];
            const bodyProps = requestBody?.properties ?? {};

            for (const tag of tags) {
                ops.push({
                    tag,
                    path: pathStr,
                    method,
                    operationId,
                    summary: operation.summary || '',
                    description: operation.description || '',
                    query,
                    body: {
                        required: bodyRequired,
                        schema: bodyProps,
                    },
                });
            }
        }
    }

    if (ops.length === 0) throw new Error('No operations found');

    const raw = generateNodeFile(ops);

    console.log('[GEN] Generated single node file:', OUT_FILE);
    await fs.writeFile(OUT_FILE, raw, 'utf-8');

    const credentialsRaw = credentialsText();
    await fs.writeFile(`src/credentials/${namespaceCase}Credentials.credentials.ts`, credentialsRaw, 'utf-8')

    const iconRaw = iconText(_.upperCase(namespaceCase.substring(0, 3)));
    await fs.writeFile(`src/nodes/icon.svg`, iconRaw, 'utf-8')

    const packageRaw = packageText({ name: NAMESPACE!, className: namespaceCase });
    await fs.writeFile(`src/package.json`, packageRaw, 'utf-8')

    execSync('npx prettier --write src')

}

run()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .then(() => {
        console.log('✅ Generated node file:', OUT_FILE);
        process.exit(0);
    })
