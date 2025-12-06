import { ICredentialType, INodeProperties } from "n8n-workflow";

export class McpClientTool implements ICredentialType {
  name = "mcptool";
  displayName = "wajs (Bearer Token)";

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
      description:
        "Masukkan token autentikasi Bearer (tanpa 'Bearer ' di depannya)",
      required: true,
    },
  ];
}
