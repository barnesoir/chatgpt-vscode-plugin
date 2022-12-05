(function () {
    console.log('lib loaded');
    const vscode = acquireVsCodeApi();

    let response = '';

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'addResponse': {
                response = message.value;
                setResponse();
                break;
            }
            case 'clearResponse': {
                response = '';
                break;
            }
        }
    });

    function setResponse() {
        const converter = new showdown.Converter();
        const html = converter.makeHtml(response);
        document.getElementById('response').innerHTML = html;

        const preCodeBlocks = document.querySelectorAll('pre code');
        preCodeBlocks.forEach(block => {
            block.classList.add('p-4', 'my-4', 'block');
        });

        const codeBlocks = document.querySelectorAll('code');
        codeBlocks.forEach(block => {
            // Check if innertext starts with "Copy code"
            if (block.innerText.startsWith('Copy code')) {
                block.innerText = block.innerText.replace('Copy code', '');
            }

            block.classList.add(
                'p-1',
                'inline-flex',
                'max-w-full',
                'overflow-hidden',
                'border',
                'rounded-sm',
                'cursor-pointer'
            );

            block.addEventListener('click', function (e) {
                e.preventDefault();
                vscode.postMessage({
                    type: 'codeSelected',
                    value: this.innerText
                });
            });
        });
    }

    document.getElementById('prompt-input').addEventListener('keyup', function (e) {
        if (e.keyCode === 13) {
            vscode.postMessage({
                type: 'prompt',
                value: this.value
            });
        }
    });
})();