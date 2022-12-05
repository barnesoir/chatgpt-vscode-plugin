import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// Register the command handler
	vscode.commands.registerCommand('chatgpt-vscode-plugin.askGPT', () => {
		// Create the Webview panel
		const panel = vscode.window.createWebviewPanel(
			'webview', // Identifies the type of the webview. Used internally
			'Webview', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true, // Allow scripts in the webview
			}
		);

		// Set the HTML content of the Webview
		panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; script-src 'unsafe-inline'; style-src vscode-resource: 'unsafe-inline';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>My Webview</title>
        </head>
        <body>
            <h1>Hello from the Webview!</h1>
        </body>
        </html>
    `;
	});



}

// This method is called when your extension is deactivated
export function deactivate() { }
