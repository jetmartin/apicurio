'use strict';

import * as vscode from 'vscode';
import { ApicurioExplorer, ApicurioVersionsExplorer, ApicurioMetasExplorer } from './apicurioExplorer';

export function activate(context: vscode.ExtensionContext) {
	const apicurioExplorer = new ApicurioExplorer(context);
	const apicurioVersionsExplorer = new ApicurioVersionsExplorer(context);  
	const apicurioMetasExplorer = new ApicurioMetasExplorer(context);
}

// this method is called when your extension is deactivated
export function deactivate() { }