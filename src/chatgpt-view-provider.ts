import { Configuration, OpenAIApi } from 'openai';
import * as vscode from 'vscode';

export default class ChatGptViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private openAiApi?: OpenAIApi;
    private apiKey?: string;
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
                this.sendOpenAiApiRequest(data.value);
            }
        });

        if (this.message !== null) {
            this.sendMessageToWebView(this.message);
            this.message = null;
        }
    }

    public async ensureApiKey() {
        this.apiKey = await this.context.globalState.get('chatgpt-api-key') as string;

        if (!this.apiKey) {
            const apiKeyInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenAI API Key, can be located at https://openai.com/account/api-keys",
                ignoreFocusOut: true,
            });
            this.apiKey = apiKeyInput!;
            this.context.globalState.update('chatgpt-api-key', this.apiKey);
        }
    }

    public async sendOpenAiApiRequest(prompt: string, code?: string) {
        await this.ensureApiKey();

        if (!this.openAiApi) {
            try {
                this.openAiApi = new OpenAIApi(new Configuration({ apiKey: this.apiKey }));
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

        let response: String = '';

        this.sendMessageToWebView({ type: 'addQuestion', value: prompt, code });
        try {
            let currentMessageNumber = this.message;
            let completion;
            try {
                completion = await this.openAiApi.createCompletion({
                    model: 'code-davinci-003',
                    prompt: question,
                    temperature: 0.5,
                    max_tokens: 2048,
                    stop: ['\n\n\n', '<|im_end|>'],
                });
            } catch (error: any) {
                await vscode.window.showErrorMessage("Error sending request to ChatGPT", error);
                return;
            }

            if (this.message !== currentMessageNumber) {
                return;
            }

            response = completion?.data.choices[0].text || '';

            const REGEX_CODEBLOCK = new RegExp('\`\`\`', 'g');
            const matches = response.match(REGEX_CODEBLOCK);
            const count = matches ? matches.length : 0;
            if (count % 2 !== 0) {
                response += '\n\`\`\`';
            }

            this.sendMessageToWebView({ type: 'addResponse', value: response });
        } catch (error: any) {
            await vscode.window.showErrorMessage("Error sending request to ChatGPT", error);
            return;
        }
    }

    public sendMessageToWebView(message: any) {
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