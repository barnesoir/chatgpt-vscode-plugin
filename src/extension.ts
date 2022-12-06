import * as vscode from 'vscode';
import { ChatGPTAPI } from 'chatgpt';

const sessionTokenName = 'sessionToken';

const queryChatGPT = async (userInput: string, api: ChatGPTAPI) => {
	await textToMarkdownPreview("please wait... <3");
	const languageId = vscode.window.activeTextEditor?.document.languageId;
	const selectedCode = vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor?.selection);
	const entireFileContents = vscode.window.activeTextEditor?.document.getText();

	const query = selectedCode
		? selectedCode + "\n" + userInput
		: `This is the ${languageId} file I'm working on \n` + entireFileContents + "\n" + userInput;

	const response = await api.sendMessage(query);
	await textToMarkdownPreview(response);
};

const textToMarkdownPreview = async (userInput: string) => {
	// Create a new temporary file for the Markdown content
	const tempFile = vscode.Uri.file('/tmp/ChatGP.md');

	// Write the user's input to the temporary file
	await vscode.workspace.fs.writeFile(tempFile, Buffer.from(userInput));

	// Open the Markdown preview and show the temporary file
	await vscode.commands.executeCommand('markdown.showPreview', tempFile);
};


export async function activate(context: vscode.ExtensionContext) {
	context.globalState.setKeysForSync([sessionTokenName]);

	if (!context.globalState.get(sessionTokenName)) {
		await setUpGPT();
	}

	const chatApi = new ChatGPTAPI({ sessionToken: context.globalState.get(sessionTokenName) as string });

	context.subscriptions.push(
		vscode.commands.registerCommand('chatgpt-vscode-plugin.setUpGPT', setUpGPT),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', askGPT),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.whyBroken', askGPTWhyBroken),
		vscode.commands.registerCommand('chatgpt-vscode-plugin.explainPls', askGPTToExplain),
	);

	async function setUpGPT() {
		let res = await vscode.window.showInputBox({ prompt: 'Please enter your access token, this can be retrieved using the guide on the README' });
		context.globalState.update(sessionTokenName, res);
	}

	async function askGPTToExplain() { await askGPT('Can you explain what this code does?'); }
	async function askGPTWhyBroken() { await askGPT('Why is this code broken?'); }

	async function askGPT(queryOverride?: string) {
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
