# n8n-nodes-wajs

This is an n8n node to integrate with Wajs (WA-Resmi), allowing you to send various types of WhatsApp messages.

Wajs is a service that provides a WhatsApp API. You can find more information and documentation at [https://wa-resmi.com](https://wa-resmi.com).

## Installation

To use this node, you need to install it in your n8n setup.

1.  Go to **Settings > Community Nodes**.
2.  Select **Install**.
3.  Enter `n8n-nodes-wajs` as the npm package name.
4.  Agree to the risks and click **Install**.

n8n will restart, and the new node will be available in the editor.

## Credentials

To use this node, you need to configure your Wajs credentials.

1.  Go to the **Credentials** section in n8n.
2.  Click **Add credential**.
3.  Search for **Wajs** and select it.
4.  Fill in the following fields:
    *   **API Key**: Your Wajs API Key.
    *   **Device Key**: Your Wajs Device Key.
5.  Click **Save**.

## Supported Operations

This node supports the following operations for the `Message` resource:

*   **Send Text**: Send a plain text message.
*   **Send Media**: Send media files like images, videos, audio, or documents.
*   **Send Button**: Send a message with interactive buttons.
*   **Send Template**: Send a pre-defined template message.
*   **Send Location**: Send a map location.
*   **Send Contact**: Send a contact card.
*   **Send Reaction**: Send a reaction to a message.
*   **Forward Message**: Forward an existing message.
*   **Check Number**: Check if a phone number is valid and has a WhatsApp account.

## Author

*   **Name**: makuro
*   **Phone**: 6289697338821

## License

ISC
