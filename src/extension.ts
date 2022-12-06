import * as vscode from 'vscode';
import { ChatGPTAPI } from 'chatgpt';

const sessionTokenName = 'sessionToken';

export async function activate(context: vscode.ExtensionContext) {
	context.globalState.setKeysForSync([sessionTokenName]);

	if (!context.globalState.get(sessionTokenName)) {
		await setUpGPT();
	}

	const chatApi = new ChatGPTAPI({ sessionToken: context.globalState.get(sessionTokenName) as string });

	context.subscriptions.push(
		vscode.commands.registerCommand('chatgpt-vscode-plugin.setUpGPT', setUpGPT),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', askChatGPT),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.whyBroken', askGPTWhyBroken),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.explainPls', askGPTToExplain),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.refactor', askGPTToRefactor),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.clearLogs', clearChatGPTLogs),
	);

	async function clearChatGPTLogs() {
		await vscode.workspace.fs.writeFile(vscode.Uri.file('/tmp/ChatGPT'), Buffer.from(''));
		vscode.window.showInformationMessage('ChatGPT logs cleared');
	}

	async function setUpGPT() {
		let res = await vscode.window.showInputBox({ prompt: 'Please enter your access token, this can be retrieved using the guide on the README' });
		context.globalState.update(sessionTokenName, res);
	}

	async function askGPTToExplain() { await askChatGPT('Can you explain what this code does?'); }
	async function askGPTWhyBroken() { await askChatGPT('Why is this code broken?'); }
	async function askGPTToRefactor() { await askChatGPT('Can you refactor this code and explain what\'s changed?'); }

	async function askChatGPT(queryOverride?: string) {
		let stateSessionToken: string | undefined = context.globalState.get(sessionTokenName);
		if (!stateSessionToken) {
			return vscode.window.showErrorMessage('You need to set up your access token first, run ChatGPT: Login');
		}

		if (!queryOverride) {
			const query = await vscode.window.showInputBox({ prompt: 'Enter your query' });
			if (!query) {
				return;
			}
			queryChatGPT(query, chatApi);
		} else {
			queryChatGPT(queryOverride, chatApi);
		}
	}
}

const queryChatGPT = async (userInput: string, api: ChatGPTAPI) => {
	await textToMarkdownPreview(spinner, "Thinking...", false);
	const languageId = vscode.window.activeTextEditor?.document.languageId;
	const selectedCode = vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor?.selection);
	const entireFileContents = vscode.window.activeTextEditor?.document.getText();

	const query = selectedCode
		? selectedCode + "\n\n" + userInput
		: `This is the ${languageId} file I'm working on: \n\n` + entireFileContents + "\n\n" + userInput;

	console.log('Querying ChatGPT...', { query });

	const response = await api.sendMessage(query);
	console.log('ChatGPT response:', { response });
	await textToMarkdownPreview(response, userInput);
};

const textToMarkdownPreview = async (textResponse: string, query: string, shouldAppend: boolean = true) => {
	if (shouldAppend) {
		const chatLog = vscode.Uri.file('/tmp/ChatGPT');
		let tempFileContents: string = '';

		try {
			tempFileContents = (await vscode.workspace.fs.readFile(chatLog)).toString();
		} catch (EntryNotFound) { }

		await vscode.workspace.fs.writeFile(chatLog, Buffer.from(`${tempFileContents}\n\n# ${query}\n\n${textResponse}`));
		await vscode.commands.executeCommand('markdown.showPreview', chatLog);
	} else {
		const tempFile = vscode.Uri.file('/tmp/ChatGPT-temp');
		await vscode.workspace.fs.writeFile(tempFile, Buffer.from(textResponse));
		await vscode.commands.executeCommand('markdown.showPreview', tempFile);
	}
};

const spinner = ` <body>
<h1 style="text-align: center; font-family: sans-serif;">Please wait while we fetch your request</h1>
<div style="text-align: center;">
  <img src="https://i.giphy.com/media/ule4vhcY1xEKQ/giphy.webp" alt="loading gif">
</div>
</body>`;