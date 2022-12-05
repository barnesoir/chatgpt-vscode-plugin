import * as vscode from 'vscode';
import { ChatGPTAPI } from '../chatgpt';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    public static readonly viewType = 'chatgpt-vscode-plugin.chatView';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _chatApi: ChatGPTAPI;

    public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getHtml(this._panel.webview);
        this._chatApi = new ChatGPTAPI({ headless: false });
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            }
        );
    }
    async search(prompt: any) {
        const isSignedIn = await this._chatApi.getIsSignedIn();
        if (!isSignedIn) {
            await this._chatApi.init();
            // await new ChatGPTAPI({ headless: false }).init();
        }

        const surroundingText = vscode.window.activeTextEditor?.document.getText();
        const selection = vscode.window.activeTextEditor?.selection;
        const selectedText = vscode.window.activeTextEditor?.document.getText(selection);
        let searchPrompt = '';

        if (selection && selectedText) {
            searchPrompt = `${selectedText}

${prompt}`;
        } else {
            searchPrompt = `This is the ${vscode.window.activeTextEditor?.document.languageId} file I'm working on:
${surroundingText}

${prompt}`;
        }

        const response = await this._chatApi.sendMessage(searchPrompt);
        this._panel.webview.postMessage({ type: 'addResponse', value: response });
    }

    getHtml(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'lib.js')
        );

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="  https://unpkg.com/showdown/dist/showdown.min.js"></script>
				<script src="https://cdn.tailwindcss.com/tailwind.min.js"></script>
				<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
				<link href="https://cdn.tailwindcss.com/tailwind.min.css" rel="stylesheet">
				<style>
					:root {
						--vscode-editor-font-family: 'Roboto', sans-serif;
						--vscode-font-family: 'Roboto', sans-serif;
					}
	
					body {
						font-family: 'Roboto', sans-serif;
					}
				</style>
				<title>Chat with GPT-3</title>
			</head>
			<body>
				<div class="bg-gray-800 h-screen w-screen flex flex-col">
					<div class="p-4 h-full flex-grow flex flex-col">
						<div class="flex-grow overflow-auto">
							<div id="conversation" class="px-4 py-2 bg-gray-800 rounded-lg"></div>
						</div>
						<form onsubmit="sendMessage(); return false;" class="bg-gray-700 px-4 py-2 rounded-lg flex items-center">
							<input id="message" class="flex-grow px-2 py-1 rounded-lg" placeholder="Enter message...">
							<button type="submit" class="px-2 py-1 rounded-lg bg-gray-800 text-gray-100">
								Send
							</button>
						</form>
					</div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
		</html>`;
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'ChatGPT',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,

                // And restrict the webview to only loading content from our extension's `media` directory.
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}