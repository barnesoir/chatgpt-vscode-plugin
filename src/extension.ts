import * as vscode from 'vscode';
import { ChatGPTAPI } from 'chatgpt';


export async function activate(context: vscode.ExtensionContext) {
	const sessionTokenName = 'sessionToken';
	context.globalState.setKeysForSync([sessionTokenName]);
	let chatApi: ChatGPTAPI;

	context.subscriptions.push(
		vscode.commands.registerCommand('chatgpt-vscode-plugin.setUpGPT', async () => {
			let userSessionToken = await vscode.window.showInputBox({ prompt: 'Please enter your access token, this can be retrieved using the guide on the README' });
			context.globalState.update(sessionTokenName, userSessionToken);
		}),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', async () => {
			let stateSessionToken: string | undefined = context.globalState.get(sessionTokenName);
			if (!stateSessionToken) {
				return vscode.window.showErrorMessage('You need to set up your access token first, run ChatGPT: Login');
			}

			const query = await vscode.window.showInputBox({ prompt: 'What do you want to do?' });
			chatApi = new ChatGPTAPI({ sessionToken: stateSessionToken });
			const res = await search(chatApi, query);
			const webViewPanel = vscode.window.createWebviewPanel(
				ChatPanel.viewType,
				'ChatGPT',
				vscode.ViewColumn.One,
				{
					// Enable javascript in the webview
					enableScripts: true,
					// And restrict the webview to only loading content from our extension's `media` directory.
					localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
				}
			);
			if (!ChatPanel.currentPanel) {
				ChatPanel.currentPanel = new ChatPanel(webViewPanel, context.extensionUri);
			}

			webViewPanel.webview.postMessage({ type: 'addResponse', value: res });
		}));

	const search = async (api: ChatGPTAPI, prompt: string | undefined) => {
		const isSignedIn = await chatApi.getIsAuthenticated();
		const _res = await chatApi.ensureAuth();
		if (!isSignedIn) {
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

		const response = await api.sendMessage(searchPrompt);
		return response;
	};

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(ChatPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] };
			}
		});
	}
}

class ChatPanel {
	public static currentPanel: ChatPanel | undefined;
	public static readonly viewType = 'chatgpt-vscode-plugin.chatView';
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.html = this.getHtml(this._panel.webview);
		this._panel.webview.onDidReceiveMessage(
			message => {
				console.log({ message });
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			}
		);
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
			<script src="https://cdn.tailwindcss.com"></script>
		</head>
		<body>
			<input class="h-10 w-full text-white bg-stone-700 p-4 text-lg font-mono" type="text" id="prompt-input" />
			<div id="response" class="pt-4 text-lg">
			</div>
			<script src="${scriptUri}"></script>
		</body>
		</html>`;
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