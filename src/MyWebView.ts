import * as vscode from 'vscode';

export class MyWebview {
    private readonly panel: vscode.WebviewPanel;

    constructor() {
        // Create the Webview panel
        this.panel = vscode.window.createWebviewPanel(
            'webview', // Identifies the type of the webview. Used internally
            'Webview', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {
                enableScripts: true, // Allow scripts in the webview
            }
        );

        // Set the HTML content of the Webview
        this.panel.webview.html = `
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
    }
}
