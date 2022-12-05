import * as vscode from 'vscode';
import { ChatGPTAPI } from 'chatgpt';

const sessionTokenName = 'sessionToken';

const queryChatGPT = async (userInput: string, api: ChatGPTAPI) => {
	const languageId = vscode.window.activeTextEditor?.document.languageId;
	const selectedCode = vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor?.selection);
	const entireFileContents = vscode.window.activeTextEditor?.document.getText();

	const query = selectedCode
		? selectedCode + "\n" + userInput
		: `This is the ${languageId} file I'm working on \n` + entireFileContents + "\n" + userInput;

	const response = await api.sendMessage(query);

	const textDoc = await vscode.workspace.openTextDocument({ content: 'Please Wait... <3', language: "markdown" });
	const textEditor = await vscode.window.showTextDocument(textDoc, {
		viewColumn: vscode.ViewColumn.Beside,
		preserveFocus: true,
		preview: true
	});

	textEditor.edit((editBuilder) => {
		editBuilder.replace(
			new vscode.Range(
				new vscode.Position(0, 0),
				new vscode.Position(Number.MAX_VALUE, 0)
			),
			response
		);
	});
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
