import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  console.log('Artemis extension activated');

  const disposable = vscode.commands.registerCommand('artemis.startChat', () => {
    const panel = vscode.window.createWebviewPanel(
      'artemisChat',
      'Artemis Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'media')),
        ],
      }
    );

    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'))
    );
    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'media', 'webview.js'))
    );

    panel.webview.html = getWebviewContent(panel.webview, styleUri, scriptUri);

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'sendPrompt') {
        const response = await queryOllama(message.text);
        panel.webview.postMessage({ command: 'response', text: response });
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, styleUri: vscode.Uri, scriptUri: vscode.Uri): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Artemis Chat</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${webview.cspSource};
    script-src 'nonce-${nonce}';
    img-src data:;
    font-src data:;
  ">
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div id="chat" role="log" aria-live="polite"></div>

  <form id="inputForm" autocomplete="off" aria-label="Chat input form">
    <div class="input-wrapper">
      <textarea id="userInput" rows="1" placeholder="Ask Artemis..."></textarea>
      <label for="userInput">Ask Artemis...</label>
    </div>
    <button id="sendBtn" type="submit" aria-label="Send message">Send</button>
  </form>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

async function queryOllama(prompt: string): Promise<string> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:14b',
        prompt,
        stream: false,
      }),
    });

    const data = await res.json();
    return data.response || '[no response]';
  } catch (err) {
    return `[error: ${err}]`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
