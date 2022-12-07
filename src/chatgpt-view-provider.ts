import { ChatGPTAPI } from 'chatgpt';
import * as vscode from 'vscode';

export default class ChatGptViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private chatGptApi?: ChatGPTAPI;
    private sessionToken?: string;
    private message?: any;

    constructor(private context: vscode.ExtensionContext) {
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            if (data.type === 'askChatGPT') {
                this.sendApiRequest(data.value);
            }
        });

        if (this.message !== null) {
            this.sendMessage(this.message);
            this.message = null;
        }
    }

    public async setUpSessionToken() {
        const sessionTokenName = 'chatgpt-session-token';
        this.sessionToken = await this.context.globalState.get(sessionTokenName) as string;

        if (!this.sessionToken) {
            const userSessionToken = await vscode.window.showInputBox({ prompt: "Please enter your token (__Secure-next-auth.session-token), this can be retrieved using the guide on the README " })
            this.sessionToken = userSessionToken!;
            this.context.globalState.update(sessionTokenName, this.sessionToken);
        }
    }

    public async sendApiRequest(prompt: string, code?: string) {
        // Initialize session token and ChatGPT API if not done already
        if (!this.sessionToken) {
            await this.setUpSessionToken();
        }
        if (!this.chatGptApi) {
            try {
                this.chatGptApi = new ChatGPTAPI({ sessionToken: this.sessionToken as string });
            } catch (error: any) {
                vscode.window.showErrorMessage("Failed to connect to ChatGPT", error?.message);
                return;
            }
        }

        // Create question by adding prompt prefix to code, if provided
        const question = (code) ? `${prompt}: ${code}` : prompt;

        if (!this.webView) {
            await vscode.commands.executeCommand('chatgpt-vscode-plugin.view.focus');
        } else {
            this.webView?.show?.(true);
        }

        // Send question to ChatGPT and show response
        this.sendMessage({ type: 'addQuestion', value: prompt, code });
        try {
            await this.chatGptApi?.ensureAuth();
            const response = await this.chatGptApi?.sendMessage(question);
            this.sendMessage({ type: 'addResponse', value: response });
        } catch (error: any) {
            await vscode.window.showErrorMessage("Error sending request to ChatGPT", error?.message);
            return;
        }
    }

    public sendMessage(message: any) {
        if (this.webView) {
            this.webView?.webview.postMessage(message);
        } else {
            this.message = message;
        }
    }

    private getHtml(webview: vscode.Webview) {

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesMainUri}" rel="stylesheet">
				<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="overflow-hidden">
				<div class="flex flex-col h-screen">
					<div class="flex-1 overflow-y-auto" id="qa-list"></div>
					<div id="in-progress" class="p-4 flex items-center hidden">
                        <div style="text-align: center;">
                            <div>Please wait while we handle your request ❤️</div>
                            <div class="loader"></div>
                            <div>Please note, ChatGPT facing scaling issues which will impact this extension</div>
                        </div>
					</div>
					<div class="p-4 flex items-center">
						<div class="flex-1">
							<textarea
								type="text"
								rows="2"
								class="border p-2 w-full"
								id="question-input"
								placeholder="Ask a question..."
							></textarea>
						</div>
						<button style="background: var(--vscode-button-background)" id="ask-button" class="p-2 ml-5">
							Ask
						</button>
					</div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}