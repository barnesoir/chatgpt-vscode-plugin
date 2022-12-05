import * as vscode from 'vscode';
import { ChatGPTAPI } from 'chatgpt';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', () => {
			ChatPanel.createOrShow(context.extensionUri);
			vscode.window.showInputBox({ prompt: 'What do you want to do?' }).then((value) => {
				ChatPanel.currentPanel?.search(value);
			});
		})
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(ChatPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] };
				ChatPanel.currentPanel = new ChatPanel(webviewPanel, context.extensionUri);
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
	private _chatApi: ChatGPTAPI;

	public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.html = this.getHtml(this._panel.webview);
		this._chatApi = new ChatGPTAPI({ sessionToken: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..qc8TWwGSx0GJ0rRZ.F9fUcMpV3MMCVPHkR1Qte6R7WVQEgQKFNoujalB-t7FXZ5cDTsJFgwBi62yQohel6JehR_i-rsM7KBDUnDde2Nxt-MPEmIh1MQNkCJ6x43e5e702IYao6kM5_rjwNhJudNw3rUavV-KanocZg1V80ln-PnjEkZ8AMvm5XdBg4NnNO--u0pzTLhOxoEWWzKNzWG1oGqBbDe1EgAEaUa_lSaR4qoK4PD7-mfwYo6uJWVOtrUpjD82wqdBhCwq8z0ATuzYhc6mMOhs7P3b_XxbqQdTOsw1f4U1hdmDZ52PmWFAwt0rSkeFvpxJuBj5aXt_qOVAlkVA4B2K0kHO1RAIaJsYN5t0LysMWrnfyETqNv9uVryjMuT-yJKpqljAkLkswIh6BsJM8DGNOP6ytQhFbht9Paz0D5sQhduN48y5zZJ8w7QX7Vp7_M4VvP7xatzObIarnfR-72HBmv8yJufyiQi-qSwZpGDIAbTtCTbjTGCDHFHRgF0MBbkunnayQFtWoO2_cnvdaQOIg3RnCVKSl6niR62dhZUWa-3Qg5I0_3gHsroWo9zxFqDBqoKuQ3u5zguDnhuGpD5MRtNpLA2hZtZJD117cwIJW8STMl3S9yl2U-bWFJJR13LGQf6jdEUtV_v5a4X34BUujI784UBGiKCcjxjM61A9G8wrzXGL_5mom7IuC9Z1_zxVximjL3DD_AENkvkN4ZgXUk11rZvQlxn4YaXC0AEM17lib1Ig70sPR6TvHHbJuc0PVr8pAdtE2SUZrY2cWdcDw69CxWAC621CZNECndBiMZalwuiDV48HzfyN3VFrpMI0oUOdg42SsbECFXuUqRIpKEqb5j1hlzVj06vtCd5kw3NnUvNbPwIG0HrGQn3u-i2OiPLPi4YDQ_bgOOG8oFKYBaO9RuY0BQKLq7hDSuVSn3OmNSBtvHcjtFCpeFE422jgig0h6XEcahDlR01hFVPxzq2ww1Zc2-M0cIJhgI4BVTYdhznIJfMGIInRGziYBKV6iWeEJqcv-i276DVkuDymTINm6yCl-AHYTZhVSlXn5VDijZ1Z-PplWkZgb_2sXjiABbxBhyBVhP_6aRA5R5hGL8fbYcwXrDiLP4fTcsfmNAuL1G2ZVBrXHul3A3u0a039USiP2sHX-1j8BgdlW4M_WiPX9o0_wdTitGIjCjcMHsSeA_NX1TVjAJ0J6yKanHeUEl20n3k7LbhwTIIKtdWQmRj1gOLacLBHUym-IrIQhIzQobdC0YvO5v2u5unTZwx4LVXEnoydRoyOBTM3Pc70LMG1eA4hTA34kn0_d90cDeGS4Dfv40atXej7lvURYrvroOzrQYlcEXEXJtbAhFvcTLBVYqWI81sZkrdb_oy1d9xE9s9SdV9p1KGaOS3_uwQdz8nqGC5ZoqJwsAN1jWl-UKAK1VVKibQ1EbzXlXju5UvmCSrRRhBfwLsUwCXukEDeeiOtz4upn_jGTRVOs99g3LupzYg6BSz-pZwLIkaH8Zw9iycOq5U903gs4ahZuxboAKKBRx6bg1tlAjFd_BsIreNkQQfiZlfKI-XUX26GWGYhK4ACkB3UNl_Gn0BfEeORNADypBzkAIk18OLlvmeqvLWTQqyfK-kOebcREQJ0NK8WyHpDb0GOaxGilbF4rMF-SBj8uRl4YTdKLnkXbR_kivlQ48Qspls1n3Gm3PUnqJQrfXgnwnP9t7BZ3khZjZds5lHmubVXRcGbj_1k7oIkFlwmoS8okqlWYgMJXVUN_lZMQ9w3QRpznt4bwlCu-C4syqzLeTU9qlRxDT8RlKfSpkfrxLpXhOYsDZRx9fXDLmMCwqowBLiMtKRAT1so_C1SPowlwB9d9V9BbX3KjacB5OIqH197WQNwtNZfJ8SfMWB53pm5OVHYQGWHomimFAyAdsaO7KXxDdJuPmtr6FoPlrAw4OHSxwQhwDaUAXq8e-EYvv06vcwOeQJyGpZbI1eHD270VPxbBDAhuPKNWuByhnwXOeeyaY0irWrUfclu6kW7J2fYcsfpxFrv0icubEDSnHLk7UNVh6B-75kKyfBvxbg0Y9EPbn-voHGB6fFgf2mZ-zB8a8Y6srYLNVPkGmO3iC5LnPrY8BOjB4Q_RSDB3muO5kdnsexFfekL6kuY.DrZiGCBP6hQ-82fCUS0iSQ' });
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
	async search(prompt: any) {
		const isSignedIn = await this._chatApi.getIsAuthenticated();
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

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// // If we already have a panel, show it.
		// if (ChatPanel.currentPanel) {
		// 	ChatPanel.currentPanel._panel.reveal(column);
		// 	return;
		// }

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