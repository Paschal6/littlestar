const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let runButton;

function activate(context) {
  runButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  runButton.command = 'littlestar.run';
  runButton.text = '$(play) Run Littlestar';
  runButton.tooltip = 'Run Littlestar in Terminal or Webview';
  context.subscriptions.push(runButton);

  updateButtonVisibility(vscode.window.activeTextEditor);
  vscode.window.onDidChangeActiveTextEditor(
    editor => updateButtonVisibility(editor),
    null,
    context.subscriptions
  );

  const runCommand = vscode.commands.registerCommand('littlestar.run', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Please open a .lstar file first!');
      return;
    }
    await editor.document.save();

    const choice = await vscode.window.showQuickPick([
      { label: '💻 Run in Interactive Terminal', description: 'CLI with choose/input support' },
      { label: '🌐 Run in Webview Engine', description: 'Full UI + Modals + Web blocks' }
    ], { placeHolder: 'How do you want to run this Littlestar file?' });

    if (!choice) return;

    if (choice.label.includes('Terminal')) {
      runInTerminal(context, editor.document.uri);
    } else {
      runInWebview(context, editor.document.getText(), path.basename(editor.document.fileName));
    }
  });

  context.subscriptions.push(runCommand);
}

function updateButtonVisibility(editor) {
  if (editor && editor.document.languageId === 'littlestar') {
    runButton.show();
  } else {
    runButton.hide();
  }
}

function runInTerminal(context, fileUri) {
  const config = vscode.workspace.getConfiguration('littlestar');
  const customCliPath = config.get('cliPath');
  
  // Use bundled CLI by default
  const bundledCli = path.join(context.extensionPath, 'littlestar-cli.js');
  const cliCommand = customCliPath ? customCliPath : `node "${bundledCli}"`;
  
  const filePath = fileUri.fsPath;

  let terminal = vscode.window.terminals.find(t => t.name === 'Littlestar Terminal');
  if (!terminal) {
    terminal = vscode.window.createTerminal('Littlestar Terminal');
  }
  terminal.show();
  terminal.sendText(`${cliCommand} "${filePath}"`);
}

function runInWebview(context, code, filename) {
  const panel = vscode.window.createWebviewPanel(
    'littlestarWeb',
    `🌟 ${filename} (Web)`,
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const htmlPath = path.join(context.extensionPath, 'runner.html');
  
  if (!fs.existsSync(htmlPath)) {
    vscode.window.showErrorMessage('❌ runner.html not found in extension folder!');
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');
  const safeCode = Buffer.from(code).toString('base64');
  html = html.replace('/* __INJECT_CODE__ */', `
    const rawCode = decodeURIComponent(escape(atob("${safeCode}")));
    setTimeout(() => startRunner(rawCode), 50);
  `);

  panel.webview.html = html;
}

function deactivate() {
  if (runButton) runButton.dispose();
}

module.exports = { activate, deactivate };