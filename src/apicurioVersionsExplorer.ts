'use strict';

import * as vscode from 'vscode';
import { SearchEntry, VersionEntry, CurrentArtifact } from './interfaces';
import { ApicurioTools } from './tools';
import * as mime from 'mime-types';

namespace _{
	export const tools = new ApicurioTools;
}

/**
 * Apicurio Versions Explorer Provider
 */

 export class ApicurioVersionsExplorerProvider implements vscode.TreeDataProvider<VersionEntry> {
	private _reverseDisplay:boolean;
	private _currentArtifact: CurrentArtifact;
	protected get currentArtifact(): CurrentArtifact {
		return this._currentArtifact;
	}
	protected set currentArtifact(value: CurrentArtifact) {
		this._currentArtifact = value;
	}
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor(){
		this._reverseDisplay = vscode.workspace.getConfiguration('apicurio.versions').get('reverse');
		this._currentArtifact = {
			group: undefined,
			id: undefined
		};
	}

	// Get latest version

	getLatestVersion(artifact): string[] | Thenable<string[]> {
		return this._getLatestVersion(artifact);
	}

	async _getLatestVersion(artifact): Promise<string[]> {
		const path = _.tools.getQueryPath(artifact, 'versions');
		const children:any = await _.tools.query(path);
		// As versionning is not necessary symver or predictable, return the most recent version.
		// The Apicurio API response is ordered by date, so the most recent is the latest.
		const version: string[] = children.versions[children.versions.length-1].version;
		vscode.window.showInformationMessage('VERSION ' + version );
		return Promise.resolve(version);
	}
	// Add version

	async addVersion(){
		const searchQuery = await vscode.window.showInputBox({title:"Search for file :", placeHolder:"**/*.json"});
		const finds: any = await vscode.workspace.findFiles(searchQuery);
		const elements:string[]=[];
		for (const i in finds) {
			if (finds[i].scheme == "file"){
				elements.push(finds[i].path);
			}
		}
		const currentFile = await vscode.window.showQuickPick(elements, {title:"Select file :"});
		if(!currentFile){
			vscode.window.showErrorMessage("No selected files.");
			return Promise.resolve();
		}
		const fileBody = await vscode.workspace.fs.readFile(vscode.Uri.file(currentFile));
		if(!fileBody){
			vscode.window.showErrorMessage(`Unnable to load the file '${currentFile}'.`);
			return Promise.resolve();
		}
		const body = fileBody.toString();
		const latestVersion = await this.getLatestVersion(this.currentArtifact);
		const version = await vscode.window.showInputBox({title:"Increment version :", prompt:`Latest version : ${latestVersion}`});
		if(!version){
			vscode.window.showErrorMessage("No defined version.");
			return Promise.resolve();
		}
		const path = _.tools.getQueryPath(this.currentArtifact, 'versions');
		const mimeType = mime.lookup(currentFile);
		const headers = {'X-Registry-Version': version, 'Content-Type': mimeType};
		await _.tools.query(path, 'POST', body, headers);
		// Refresh view to display version.
		this._onDidChangeTreeData.fire(undefined);
	}

	// Delete version
	
	async deleteArtifact(deleteVersion?:boolean){
		// Confirm box
		const confirm = await vscode.window.showQuickPick(_.tools.getLists('confirm'), {title:`Are you shure to delete '${this.currentArtifact.group}/${this.currentArtifact.id}'`, canPickMany:false});
		if(confirm != "yes"){
			return Promise.resolve();
		}
		// Confirm box
		const irreversible = await vscode.window.showQuickPick(_.tools.getLists('confirm'), {title:`This action is irreversible, continue ?`, canPickMany:false});
		if(irreversible != "yes"){
			return Promise.resolve();
		}
		const path = _.tools.getQueryPath(this.currentArtifact, 'delete');
		await _.tools.query(path, 'DELETE');
		// Refresh view.
		vscode.commands.executeCommand('apicurioExplorer.refreshEntry');
		this._onDidChangeTreeData.fire(undefined);
		vscode.commands.executeCommand('apicurioMetasExplorer.refresh');
	}


	// Commands functions

	async refresh(): Promise<any> {
		this._onDidChangeTreeData.fire(undefined);
	}
	async refreshElement(element:SearchEntry): Promise<any> {
		this.changeCurrentArtifact(element);
		this.refresh();
	}

	private changeCurrentArtifact(element:SearchEntry){
		this.currentArtifact = {group: element.groupId, id: element.id};
	}
	
	public reverseDisplay(){
		this._reverseDisplay = (this._reverseDisplay) ? false : true;
		this._onDidChangeTreeData.fire(undefined); // Refresh view.
	}

	// Read Artifact

	readArtifact(group: string, id: string, version?: string): any | Thenable<any> {
		return this._readArtifact(group, id, (version) ? version : 'latest');
	}
	async _readArtifact(group: string, id: string, version: string): Promise<any> {
		const path = _.tools.getQueryPath({group:group,id:id,version:version});
		const child:any = await _.tools.query(path);
		return Promise.resolve(child);
	}

	// Open Artifact

	getArtifactType(): string | Thenable<string> {
		return this._getArtifactType();
	}

	async _getArtifactType(): Promise<string> {
		const path = _.tools.getQueryPath(this.currentArtifact, 'meta');
		const child:any = await _.tools.query(path);
		return Promise.resolve(child.type);
	}

	async openVersion(artifact: vscode.Uri): Promise<any> {
		const tmp:string = JSON.stringify(artifact);
		const data:VersionEntry = JSON.parse(tmp);
		let children:any = await this.readArtifact(data.groupId, data.id, data.version);
		// @TODO manage other extentions if require for other formats.
		let extention = '';
		const artifactType = await this.getArtifactType();
		if(typeof children === 'object'){
			children = JSON.stringify(children);
			extention = 'json';
		}
		else{
			switch (artifactType) {
				case "OPENAPI":
				case "ASYNCAPI":
					extention = 'yml';
					break;
				case "AVRO":
					extention = 'avro';
					break;
				case "GRAPHQL":
					extention = 'gql';
					break;
				case "XML":
				case "XSD":
				case "WSDL":
					extention = 'xml';
					break;
				case "PROTOBUF":
					extention = 'proto';
					break;
				case "KCONNECT":
				case "JSON":
					extention = 'json';
					break;
				default:
					extention = 'txt';
					break;
			}
		}

		// Mamage document
		const fileName = `${data.groupId}--${data.id}--${data.version}.${extention}`;
		const newUri = vscode.Uri.file(fileName).with({ scheme: 'untitled', path: fileName });
		vscode.workspace.openTextDocument(newUri).then((a: vscode.TextDocument) => {
			vscode.window.showTextDocument(a, 1, false).then(e => {
				e.edit(edit => {
					edit.insert(new vscode.Position(0, 0), children);
				});
			});
		}, (error: any) => {
			console.error(error);
		});
		if(vscode.workspace.getConfiguration('apicurio.tools.preview').get('OPENAPI')
			&& vscode.extensions.getExtension('Arjun.swagger-viewer')){
			if(artifactType == 'OPENAPI'){
				// @FIXME : Quick & dirty timeout to manage delai to insert content befor triger preview function...
				setTimeout(() => {vscode.commands.executeCommand('swagger.preview');}, 500);
			}
		}
		return Promise.resolve();
	}

	getVersions(group: string, id: string): VersionEntry[] | Thenable<VersionEntry[]> {
		return this._getVersions(group, id);
	}

	async _getVersions(group: string, id: string): Promise<VersionEntry[]> {
		const path = _.tools.getQueryPath(this.currentArtifact, 'versions');
		const children:any = await _.tools.query(path);
		const result: VersionEntry[] = [];
		for (let i = 0; i < children.versions.length; i++) {
			const child: VersionEntry = {
				groupId: group, 
				id: id,
				name: children.versions[i].name,
				description: '',
				type: children.versions[i].type,
				state: children.versions[i].state,
				version: children.versions[i].version,
				createdOn: children.versions[i].createdOn,
				parent: false
			};
			result.push(child);
		}
		// Reverse result
		if(this._reverseDisplay) {
			result.reverse();
		}
		return Promise.resolve(result);
	}

	// tree data provider

	async getChildren(element?: SearchEntry): Promise<VersionEntry[]> {
		let artifact:CurrentArtifact={group:undefined,id:undefined};
		if(this.currentArtifact.group){
			artifact={
				group: this.currentArtifact.group,
				id: this.currentArtifact.id
			};
		}
		if (element) {
			artifact={
				group: element.groupId,
				id: element.id
			};
		}
		if(artifact.group){
			const children: VersionEntry[] = await this.getVersions(artifact.group, artifact.id);
			return Promise.resolve(children);
		}
		return Promise.resolve([]);
	}

	getTreeItem(element: VersionEntry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.version, vscode.TreeItemCollapsibleState.None); // None / Collapsed
		treeItem.description = element.createdOn;
		// treeItem.command = { command: 'apicurioVersionsExplorer.openVersion', title: "Display artifact versions", arguments: [element] };
		treeItem.command = { command: 'apicurioMetasExplorer.getChildren', title: "Display artifact versions Metas", arguments: [element] };
		return treeItem;
	}
}

export class ApicurioVersionsExplorer{
	constructor(context: vscode.ExtensionContext) {
		const treeDataProvider = new ApicurioVersionsExplorerProvider();
		context.subscriptions.push(vscode.window.createTreeView('apicurioVersionsExplorer', { treeDataProvider }));
		vscode.commands.registerCommand('apicurioVersionsExplorer.refresh', () => treeDataProvider.refresh());
		vscode.commands.registerCommand('apicurioVersionsExplorer.getChildren', (element) => treeDataProvider.refreshElement(element));
		vscode.commands.registerCommand('apicurioVersionsExplorer.addVersion', () => treeDataProvider.addVersion());
		vscode.commands.registerCommand('apicurioVersionsExplorer.deleteArtifact', (element) => treeDataProvider.deleteArtifact());
		vscode.commands.registerCommand('apicurioVersionsExplorer.reverseDisplay', () => treeDataProvider.reverseDisplay());
		vscode.commands.registerCommand('apicurioVersionsExplorer.openVersion', async (artifact) => {
			try {
				await treeDataProvider.openVersion(artifact);
			} catch (e) {
				vscode.window.showErrorMessage(e);
			}
		});
	}
	
}
