import * as vscode from 'vscode';
import { ChatGPTAPI } from './chatgpt';

export function activate(context: vscode.ExtensionContext) {
	const provider = new GPTViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(GPTViewProvider.viewType, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', () => {
			vscode.window.showInputBox({ prompt: 'What do you want to do?' }).then((value) => {
				provider.search(value);
			});
		})
	);
}

class GPTViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'chatgpt-vscode-plugin.chatView';

	private _view?: vscode.WebviewView;
	private _chatGPTAPI = new ChatGPTAPI({ headless: false });

	constructor(private readonly _extensionUri: vscode.Uri) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;
		this.configureWebview(webviewView.webview);
		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'codeSelected': {
					const code = data.value.replace(/([^\\])(\$)([^{0-9])/g, "$1\\$$$3");
					vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(code));
					break;
				}
				case 'prompt': {
					this.search(data.value);
				}
			}
		});
	}

	public async search(prompt: any) {
		const isSignedIn = await this._chatGPTAPI.getIsSignedIn();
		if (!isSignedIn) {
			await this._chatGPTAPI.init();
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

		const response = await this._chatGPTAPI.sendMessage(searchPrompt);
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'addResponse', value: response });
		}
	}

	private configureWebview(webview: vscode.Webview) {
		webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};
	}

	private getHtmlForWebview(webview: vscode.Webview) {
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
}