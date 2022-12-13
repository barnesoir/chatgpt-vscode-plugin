import { ChatGPTAPI, ChatGPTConversation } from 'chatgpt';
import * as vscode from 'vscode';

export default class ChatGptViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private chatGptApi?: ChatGPTAPI;
    private chatGptConversaion?: ChatGPTConversation;
    private sessionToken?: string;
    private clearanceToken?: string;
    private userAgent?: string;
    private message?: any;

    constructor(private context: vscode.ExtensionContext) { }

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
            if (data.type === 'clearChat') {
                this.chatGptConversaion = this.chatGptApi?.getConversation();
            }
        });

        if (this.message !== null) {
            this.sendMessage(this.message);
            this.message = null;
        }
    }

    public async setUpTokens() {
        this.sessionToken = await this.context.globalState.get('chatgpt-session-token') as string;

        if (!this.sessionToken) {
            const userSessionToken = await vscode.window.showInputBox({
                prompt: "Please enter your session token (__Secure-next-auth.session-token), this can be retrieved using the guide on the README ",
                ignoreFocusOut: true,
            });
            this.sessionToken = userSessionToken!;
            this.context.globalState.update('chatgpt-session-token', this.sessionToken);
        }

        this.clearanceToken = await this.context.globalState.get('chatgpt-clearance-token') as string;

        if (!this.clearanceToken) {
            const userClearanceToken = await vscode.window.showInputBox({
                prompt: "Please enter your clearance token (cf_clearance), this can be retrieved using the guide on the README ",
                ignoreFocusOut: true,
            });
            this.clearanceToken = userClearanceToken!;
            this.context.globalState.update('chatgpt-clearance-token', this.clearanceToken);
        }

        this.userAgent = await this.context.globalState.get('chatgpt-user-agent') as string;
        if (!this.userAgent) {
            const userUserAgent = await vscode.window.showInputBox({
                prompt: "Please enter your user agent, this can be retrieved using the guide on the README ",
                ignoreFocusOut: true,
                value: this.userAgent
            });
            this.userAgent = userUserAgent!;
            this.context.globalState.update('chatgpt-user-agent', this.userAgent);
        }
    }

    public async sendApiRequest(prompt: string, code?: string) {
        await this.setUpTokens();

        if (!this.chatGptApi || !this.chatGptConversaion) {
            try {
                this.chatGptApi = new ChatGPTAPI({
                    sessionToken: this.sessionToken as string,
                    clearanceToken: this.clearanceToken as string,
                    userAgent: this.userAgent as string
                });
                this.chatGptConversaion = this.chatGptApi?.getConversation();
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
            const response = await this.chatGptConversaion.sendMessage(question, {
                timeoutMs: 2 * 60 * 1000
            });

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
						<button style="background: var(--vscode-button-background)" id="ask-button" class="p-2 ml-5">Ask</button>
						<button style="background: var(--vscode-button-background)" id="clear-button" class="p-2 ml-3">Clear</button>
					</div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}