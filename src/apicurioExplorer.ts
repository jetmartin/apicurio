'use strict';

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';

//#region Utilities

interface SearchEntry {
	groupId: string;
	id: string;
	name: string;
	description: string;
	type: string;
	state: string;
	version?: string;
	parent: boolean;
}

interface VersionEntry extends SearchEntry {
	version: string;
	createdOn: string;
	parent: boolean;
}

interface MetaEntry extends VersionEntry {
	meta:string,
	value:string,
	labels?: string[],
	properties?: any;
	activeMeta?: string
}

interface CurrentArtifact {
	group: string;
	id: string;
	version?: string;
}

namespace _ {

	function getApicurioSettings(): any {
		const settings: any = {
			hostname : vscode.workspace.getConfiguration('apicurio.http').get('host'),
			port : vscode.workspace.getConfiguration('apicurio.http').get('port'),
			path : vscode.workspace.getConfiguration('apicurio.http').get('path')
		};
		return settings;
    }

	export function getData(path: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
		const hhttpx = (vscode.workspace.getConfiguration('apicurio.http').get('secure')) ? https : http;
		const settings = getApicurioSettings();
		const req = hhttpx.request({
			hostname: settings.hostname,
			port: settings.port,
			path: `${settings.path}${path}`,
			method: 'GET'
		}, function(res) {
			// reject on bad status
			if (res.statusCode < 200 || res.statusCode >= 300) {
				return reject(new Error('statusCode=' + res.statusCode));
			}
			// cumulate data
			const body = [];
			res.on('data', function(chunk) {
				body.push(chunk);
			});
			// resolve on end
			// @TODO Manage error if response is not a valid JSON.
			res.on('end', () => resolve(JSON.parse(Buffer.concat(body).toString())));
		});
		req.on('error', (e) => {
			vscode.window.showErrorMessage('Apicurio http Error', { modal: false });
			return reject(new Error('Error=' + e));
		});
		req.end();
		});
	}
}

/**
 * Apicurio Explorer Provider
 */

export class ApicurioExplorerProvider implements vscode.TreeDataProvider<SearchEntry> {
	private _extensionUri:any;
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor(extensionUri){
		this._extensionUri = extensionUri;
	}
	public refresh(): any {
		this._onDidChangeTreeData.fire(undefined);
	}

	// Read Directory

	readDirectory(groupId: string): SearchEntry[] | Thenable<SearchEntry[]> {
		return this._readDirectory(groupId);
	}

	async _readDirectory(groupId: string): Promise<SearchEntry[]> {
		let children:any;
		const limit: number = vscode.workspace.getConfiguration('apicurio.search').get('limit');
		// Child
		if(groupId){
			children = await _.getData(`search/artifacts?group=${groupId}&limit=${limit}&offset=0`);
		}
		else{
		// Parent
			children = await _.getData(`search/artifacts?limit=${limit}&offset=0`);
		}
		const result: SearchEntry[] = [];
		const currentGroup: string[] = [];
		for (let i = 0; i < children.artifacts.length; i++) {
			// Manage parents
			if(!groupId && currentGroup.includes(children.artifacts[i].groupId)){
				continue;
			}
			currentGroup.push(children.artifacts[i].groupId);
			// for all items
			const child: SearchEntry = {
				groupId: children.artifacts[i].groupId, 
				id: children.artifacts[i].id,
				name: children.artifacts[i].name,
				description: children.artifacts[i].description,
				type: children.artifacts[i].type,
				state: children.artifacts[i].state,
				parent: ((groupId)? false : true)
			};
			result.push(child);
		}
		// Sort result, as the API do not allow sort by Group or ID but only by name or update date
		result.sort(function(a, b) {
			const nameA = a.groupId.toLowerCase()+a.id.toLowerCase(); // ignore upper and lowercase
			const nameB = b.groupId.toLowerCase()+b.id.toLowerCase(); // ignore upper and lowercase
			if (nameA < nameB) {
			return -1;
			}
			if (nameA > nameB) {
			return 1;
			}
			// names must be equal
			return 0;
		});

		return Promise.resolve(result);
	}

	// custom command
	refreshChildViews(element:SearchEntry){
		vscode.commands.executeCommand('apicurioVersionsExplorer.getChildren', element);
		vscode.commands.executeCommand('apicurioMetasExplorer.getChildren', element);
	}

	// tree data provider

	async getChildren(element?: SearchEntry): Promise<SearchEntry[]> {
		const children: SearchEntry[] = await this.readDirectory((element)? element.groupId : '');
		return Promise.resolve(children);
	}

	getTreeItem(element: SearchEntry): vscode.TreeItem {
		if(element.parent){
			const treeItem = new vscode.TreeItem(element.groupId, vscode.TreeItemCollapsibleState.Collapsed); // None / Collapsed
			return treeItem;
		}
		const treeItem = new vscode.TreeItem(element.id, vscode.TreeItemCollapsibleState.None); // None / Collapsed
		treeItem.command = { command: 'apicurioExplorer.refreshChildViews', title: "Display artifact versions", arguments: [element] };
		treeItem.description = element.state.toLowerCase();
		treeItem.tooltip = (element.name) ? element.name : element.id;
		// treeItem.iconPath = new vscode.ThemeIcon('key');
		treeItem.iconPath = {
			dark: vscode.Uri.joinPath(this._extensionUri, "resources", "dark", element.type.toLowerCase()+".svg"),
			light: vscode.Uri.joinPath(this._extensionUri, "resources", "light", element.type.toLowerCase()+".svg"),
		};
		return treeItem;
	}
}

export class ApicurioExplorer {
	constructor(context: vscode.ExtensionContext) {
		const treeDataProvider = new ApicurioExplorerProvider(context.extensionUri);
		context.subscriptions.push(vscode.window.createTreeView('apicurioExplorer', { treeDataProvider, showCollapseAll: true }));
		vscode.commands.registerCommand('apicurioExplorer.refreshChildViews', (element) => treeDataProvider.refreshChildViews(element));
		vscode.commands.registerCommand('apicurioExplorer.refreshEntry', () => treeDataProvider.refresh());
	}
}

/**
 * Apicurio Versions Explorer Provider
 */

 export class ApicurioVersionsExplorerProvider implements vscode.TreeDataProvider<VersionEntry> {
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
		this._currentArtifact = {
			group: undefined,
			id: undefined
		};
	}
	async refresh(element:SearchEntry): Promise<any> {
		this.changeCurrentArtifact(element);
		this._onDidChangeTreeData.fire(undefined);
	}
	private changeCurrentArtifact(element:SearchEntry){
		this.currentArtifact = {group: element.groupId, id: element.id};
	}

	// Read Artifact

	readArtifact(group: string, id: string, version?: string): any | Thenable<any> {
		return this._readArtifact(group, id, (version) ? version : 'latest');
	}
	async _readArtifact(group: string, id: string, version?: string): Promise<any> {
		const child:any = await _.getData(`groups/${group}/artifacts/${id}${(version) ? `/versions/${version}` : ``}`);
		return Promise.resolve(child);
	}

	// Open Artifact

	async openVersion(artifact: vscode.Uri): Promise<any> {
		const tmp:string = JSON.stringify(artifact);
		const data:VersionEntry = JSON.parse(tmp);
		const children:any = await this.readArtifact(data.groupId, data.id, data.version);

		// Mamage document
		const fileName = `${data.groupId}--${data.id}--${data.version}.json`;
		const newUri = vscode.Uri.file(fileName).with({ scheme: 'untitled', path: fileName });
		vscode.workspace.openTextDocument(newUri).then((a: vscode.TextDocument) => {
			vscode.window.showTextDocument(a, 1, false).then(e => {
				e.edit(edit => {
					edit.insert(new vscode.Position(0, 0), JSON.stringify(children));
				});
			});
		}, (error: any) => {
			console.error(error);
		});
		if(vscode.workspace.getConfiguration('apicurio.tools.preview').get('OPENAPI')
			&& vscode.extensions.getExtension('Arjun.swagger-viewer')){
			// @FIXME : Quick & dirty timeout to manage delai to insert content befor triger preview function...
			setTimeout(() => {vscode.commands.executeCommand('swagger.preview');}, 500);
		}
		return Promise.resolve();
	}

	getVersions(group: string, id: string): VersionEntry[] | Thenable<VersionEntry[]> {
		return this._getVersions(group, id);
	}

	async _getVersions(group: string, id: string): Promise<VersionEntry[]> {
		const children:any = await _.getData(`groups/${group}/artifacts/${id}/versions`);
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
		vscode.commands.registerCommand('apicurioVersionsExplorer.getChildren', (element) => treeDataProvider.refresh(element));
		vscode.commands.registerCommand('apicurioVersionsExplorer.openVersion', async (artifact) => {
			try {
				await treeDataProvider.openVersion(artifact);
			} catch (e) {
				vscode.window.showErrorMessage(e);
			}
		});
	}
	
}

/**
 * Apicurio Metas Explorer Provider
 */

export class ApicurioMetasExplorerProvider implements vscode.TreeDataProvider<VersionEntry> {
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
		this._currentArtifact = {
			group: undefined,
			id: undefined,
			version: undefined
		};
	}

	async refresh(element:SearchEntry|VersionEntry): Promise<any> {
		this.changeCurrentArtifact(element);
		this._onDidChangeTreeData.fire(undefined);
	}
	private changeCurrentArtifact(element:SearchEntry|VersionEntry){
		this.currentArtifact = {
			group: element.groupId,
			id: element.id,
			version: (element.version) ? element.version : 'latest'
		};
	}

	readMetas(group: string, id: string, version?: string): MetaEntry[] | Thenable<MetaEntry[]> {
		return this._readMetas(group, id, (version)? version : 'latest');
	}

	async _readMetas(group: string, id: string, version?: string): Promise<MetaEntry[]> {
		const query =(version && version != 'latest') ? `groups/${group}/artifacts/${id}/versions/${version}/meta` : `groups/${group}/artifacts/${id}/meta`;
		const children:any = await _.getData(query);
		const result:MetaEntry[]=[];
		for(const i in children){
			const met:MetaEntry = {
				meta:i,
				value:children[i],
				groupId: group,
				id: id,
				name: '',
				description: '',
				type: '',
				state: '',
				version: '',
				createdOn: '',
				labels: children.labels,
				properties: children.properties,
				parent: false
			};
			result.push(met);
		}
		return Promise.resolve(result);
	}

	_activeMetaAsMetaEntry(element, activeMeta){
		const result:MetaEntry[]=[];
		for(const i in element[activeMeta]){
				const met:MetaEntry = {
					meta: (activeMeta=='labels') ? element[activeMeta][i] : i, // If meta is labels, display in meta instead of value.
					value: (activeMeta=='labels') ? '' : element[activeMeta][i], // If meta is labels, display in meta instead of value.
					groupId: element.group,
					id: element.id,
					name: '',
					description: '',
					type: '',
					state: '',
					version: '',
					createdOn: '',
					parent: false
				};
				result.push(met);
			}
		return result;
	}

	// tree data provider

	async getChildren(element?: any): Promise<MetaEntry[]> {
		// Retrive Active Meta (AKA : meta tree item children such as labels or properties)
		if(element && element.activeMeta) {
			element.meta = element.activeMeta;
			const metaObject: MetaEntry[] = this._activeMetaAsMetaEntry(element, element.activeMeta);
			return Promise.resolve(metaObject);

		}
		// Retrive Artivact version metas
		let artifact:CurrentArtifact=this.currentArtifact;
		if(this.currentArtifact.group){
			artifact={
				group: this.currentArtifact.group,
				id: this.currentArtifact.id,
				version: (this.currentArtifact.version) ? this.currentArtifact.version : 'latest'
			};
		}
		if (element) {
			artifact={
				group: element.groupId,
				id: element.id,
				version: (element.version) ? element.version : 'latest'
			};
		}
		if(artifact.group){
			const children: MetaEntry[] = await this.readMetas(artifact.group, artifact.id, artifact.version);
			return Promise.resolve(children);
		}
		return Promise.resolve([]);
	}

	getTreeItem(element: MetaEntry): vscode.TreeItem {
		let treeItem:vscode.TreeItem = {};
		switch (element.meta) {
			case 'labels' :
			case 'properties' :
				element.activeMeta = element.meta;
				treeItem = new vscode.TreeItem(element.meta, vscode.TreeItemCollapsibleState.Collapsed); // None / Collapsed
				break;
		
			default:
				treeItem = new vscode.TreeItem(element.meta, vscode.TreeItemCollapsibleState.None); // None / Collapsed
				treeItem.description = element.value;
				break;
		}
		return treeItem;
	}
}

export class ApicurioMetasExplorer{
	constructor(context: vscode.ExtensionContext) {
		const treeDataProvider = new ApicurioMetasExplorerProvider();
		context.subscriptions.push(vscode.window.createTreeView('apicurioMetasExplorer', { treeDataProvider }));
		vscode.commands.registerCommand('apicurioMetasExplorer.getChildren', (element) => treeDataProvider.refresh(element));
	}
	
}