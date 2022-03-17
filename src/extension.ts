'use strict';

import * as vscode from 'vscode';
import { ApicurioExplorer } from './apicurioExplorer';
import { ApicurioVersionsExplorer } from './apicurioVersionsExplorer';
import { ApicurioMetasExplorer } from './apicurioMetasExplorer';

export function activate(context: vscode.ExtensionContext) {
	const apicurioExplorer = new ApicurioExplorer(context);
	const apicurioVersionsExplorer = new ApicurioVersionsExplorer(context);  
	const apicurioMetasExplorer = new ApicurioMetasExplorer(context);
}
