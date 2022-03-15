'use strict';

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as mime from 'mime-types';
import { TextDecoderStream } from 'stream/web';

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

interface Search{
	attribut: string;
	search: string;
}

namespace _ {

	/**
	 * Retrive Quick Pick confirm options.
	 * 
	 * @returns Array
	 */
	export function getQuickPickConfirmOption(){
		return ["yes","no"];
	}

	/**
	 * Retrive Apicurio edit options
	 * 
	 * @returns Array
	 */
	export function getQuickPickEditOption(){
		return ["Add", "Delete"];
	}

	/**
	 * Retrive Apicurio add options
	 * 
	 * @returns Array
	 */
	export function getQuickPickAddOption(){
		return ["NEW","EXISTING"];
	}

	/**
	 * Retrive Apicurio search options
	 * 
	 * @returns Array
	 */
	export function getQuickPickSearchOption(){
		return ['name', 'group', 'description', 'type', 'state', 'labels', 'properties'];
	}

	/**
	 * Retrive Apicurio editable metas
	 * 
	 * @returns Array
	 */
	export function getApicurioEditableMetas(){
		return ["name", "description", "labels", "properties"];
	}
	/**
	 * Retrive Apicurio States.
	 * 
	 * @returns Array apicurio States.
	 */
	export function getApicurioStates(){
		return ["ENABLED", "DISABLED", "DEPRECATED"];
	}

	/**
	 * Retrive Apicurio artifact types.
	 * 
	 * @returns Array apicurio artifact types.
	 */
	export function getArtifactTypes(){
		return ["AVRO","PROTOBUF","JSON","OPENAPI","ASYNCAPI","GRAPHQL","KCONNECT","WSDL","XSD","XML"];
	}

	/**
	 * Retrive apicurio query path
	 * 
	 * @returns string
	 */
	export function getQueryPath(artifact:CurrentArtifact, type?:string, params?:object){
		let path = '';
		type = (!type) ? 'default': type;
		switch (type) {
			case 'meta':
				path = `groups/${artifact.group}/artifacts/${artifact.id}${(artifact.version && artifact.version!='latest') ? `/versions/${artifact.version}` : ``}/meta`;
				break;
			case 'versions':
				path = `groups/${artifact.group}/artifacts/${artifact.id}/versions`;
				break;
			case 'group':
				path = `groups/${artifact.group}/artifacts`;
				break;
			case 'delete':
				path = `groups/${artifact.group}/artifacts/${artifact.id}`;
				break;
			case 'search':
				path = `search/artifacts`;
				break;
			default:
				path = `groups/${artifact.group}/artifacts/${artifact.id}${(artifact.version && artifact.version!='latest') ? `/versions/${artifact.version}` : ``}`;
				break;
		}
		let parameters='';
		for (const key in params) {
			parameters = `${parameters}${(!parameters)?'?':'&'}${key}=${params[key]}`;
		}
		return `${path}${parameters}`;
	}
	/**
	 * Retrive Apicurio http settings
	 * 
	 * @returns object
	 */
	function getApicurioHttpSettings(): any {
		const settings: any = {
			hostname : vscode.workspace.getConfiguration('apicurio.http').get('host'),
			port : vscode.workspace.getConfiguration('apicurio.http').get('port'),
			path : vscode.workspace.getConfiguration('apicurio.http').get('path')
		};
		return settings;
    }

	/**
	 * Query http(s) datas
	 * 
	 * @param path string The http api endpoint relative path
	 * @param method string Nethod if not default (GET)
	 * @param body object The optional request body
	 * @returns http body
	 */
	export function query(path: string, method?:string, body?:any, headers?:any): Promise<string> {
		return new Promise<string>((resolve, reject) => {
		const hhttpx = (vscode.workspace.getConfiguration('apicurio.http').get('secure')) ? https : http;
		const settings = getApicurioHttpSettings();
		headers = (!headers) ? {'Content-Type': 'application/json', 'Accept': '*/*'}: headers;
		const req = hhttpx.request({
			hostname: settings.hostname,
			port: settings.port,
			path: `${settings.path}${path}`,
			method: (method)? method :'GET',
			headers: headers
		}, function(res) {
			// reject on bad status
			if (res.statusCode < 200 || res.statusCode >= 300) {
				return reject(new Error('statusCode=' + res.statusCode));
			}
			switch (res.statusCode) {
				case 204:
					// Fix resolution issue for no body 204 (PUT) responses on Apicurio API
					resolve('');
					break;
				case 400:
					// Fix resolution issue for 400 responses on Apicurio API
					vscode.window.showErrorMessage("Apicurio : retrun a 400 error.");
					resolve('');
					break;
				case 404:
					// Fix resolution issue for 404 responses on Apicurio API
					vscode.window.showErrorMessage("Apicurio : Not found.");
					resolve('');
					break;
				case 409:
					// Fix resolution issue for 409 responses on Apicurio API
					vscode.window.showErrorMessage("Apicurio : conflicts with existing data.");
					resolve('');
					break;
				default:
					break;
			}
			// cumulate data
			const body = [];
			res.on('data', function(chunk) {
				body.push(chunk);
			});
			// resolve on end
			// Manage error if response is not a valid JSON.
			// Apicurio return a JSON content-type for any return such as Yaml...
			// vscode.window.showInformationMessage('content-type : ' + res.headers['content-type']);
			res.on('end', () => {
				let parsedData = '';
				try {
					parsedData = JSON.parse(Buffer.concat(body).toString());
				} catch (e) {
					parsedData = Buffer.concat(body).toString();
				}
				resolve(parsedData);
			});
		});
		req.on('error', (e) => {
			vscode.window.showErrorMessage('Apicurio http Error', { modal: false });
			return reject(new Error('Error=' + e));
		});
		if(body){
			if(typeof body !== 'string'){
				body = JSON.stringify(body);
			}
			req.write(body);
		}
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

	private _currentSearch:Search;
	protected get currentSearch(): Search{
		return this._currentSearch;
	}
	protected set currentSearch(value: Search) {
		this._currentSearch = value;
	}

	constructor(extensionUri){
		this._extensionUri = extensionUri;
		this._currentSearch={attribut:'', search:''};
	}
	public refresh(search?:Search): any {
		this.currentSearch = (search) ? search : {attribut:'', search:''};
		this._onDidChangeTreeData.fire(undefined);
	}

	// Get Groups

	getGroups(): string[] | Thenable<string[]> {
		return this._getGroups();
	}

	async _getGroups(): Promise<string[]> {
		const limit: number = vscode.workspace.getConfiguration('apicurio.search').get('limit');
		const path = _.getQueryPath({"id":null, "group":null}, 'search', {limit:limit, offset:0});
		const children:any = await _.query(path);
		const groups: string[] = [];
		for (let i = 0; i < children.artifacts.length; i++) {
			// Manage parents
			if(groups.includes(children.artifacts[i].groupId)){
				continue;
			}
			groups.push(children.artifacts[i].groupId);
		}
		return Promise.resolve(groups);
	}
	// Read Directory

	readDirectory(groupId: string): SearchEntry[] | Thenable<SearchEntry[]> {
		return this._readDirectory(groupId);
	}

	async _readDirectory(groupId: string): Promise<SearchEntry[]> {
		const searchParam = {};
		const limit: number = vscode.workspace.getConfiguration('apicurio.search').get('limit');
		// Manage search parameters
		if(this.currentSearch.attribut){
			searchParam[this.currentSearch.attribut] = this.currentSearch.search;
		}
		if(groupId){
			searchParam['group'] = groupId;
		}
		searchParam[this.currentSearch.attribut] = this.currentSearch.search;
		searchParam['limit'] = limit;
		searchParam['offset'] = 0;
		// Manage request
		const path = _.getQueryPath({group:null,id:null},'search',searchParam);
		const children = await _.query(path);
		const result: SearchEntry[] = [];
		const currentGroup: string[] = [];
		for (let i = 0; i < children.artifacts.length; i++) {
			// Manage parents
			if(!groupId && currentGroup.includes(children.artifacts[i].groupId)){
				continue;
			}
			currentGroup.push(children.artifacts[i].groupId);
			// for all items
			// Manage custom searches (not available on Apicurio API)
			if(this.currentSearch.attribut=='type' && this.currentSearch.search!=children.artifacts[i].type){
				continue;
			}
			if(this.currentSearch.attribut=='state' && this.currentSearch.search!=children.artifacts[i].state){
				continue;
			}
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
		// Return empty result
		if(result.length==0){
			const isEmpty: SearchEntry = {
				groupId: 'No content', 
				id: '',
				name: '',
				description: '',
				type: '',
				state: '',
				parent: true
			};
			return Promise.resolve([isEmpty]);
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

	// Add artifact

	async addArtifact(){
		const existingGroup = await vscode.window.showQuickPick(_.getQuickPickAddOption(), {title:"New or existing group ?"});
		let groupId = "";
		if(existingGroup == "NEW"){
			groupId =  await vscode.window.showInputBox({title:"Create a new Group ID"});
			const confirmGroupId =  await vscode.window.showInputBox({title:"Confirm new Group ID"});
			if(groupId != confirmGroupId){
				vscode.window.showErrorMessage("Group ID did not match with confirmation.");
				return Promise.resolve();
			}
		}
		if(existingGroup == "EXISTING"){
			const groups = this.getGroups();
			groupId = await vscode.window.showQuickPick(groups, {title:"Choose group :"});
			// Confirm box
			const confirm = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:`Do you want to use group : '${groupId}'`, canPickMany:false});
			if(confirm != "yes"){
				return Promise.resolve();
			}
		}
		if(!groupId || groupId == ""){
			vscode.window.showErrorMessage("No group defined.");
			return Promise.resolve();
		}
		const artifactType = await vscode.window.showQuickPick(_.getArtifactTypes(), {title:"Choose an artifact type to push :"});
		if(!artifactType){
			vscode.window.showErrorMessage("No defined type.");
			return Promise.resolve();
		}
		const artifactId =  await vscode.window.showInputBox({title:"Artifact ID"});
		if(!artifactId){
			vscode.window.showErrorMessage("No defined artifact ID.");
			return Promise.resolve();
		}
		const version =  await vscode.window.showInputBox({title:"Initial version", placeHolder:"1.0.0"});
		if(!version){
			vscode.window.showErrorMessage("No defined version.");
			return Promise.resolve();
		}
		const searchQuery = await vscode.window.showInputBox({title:"Search for file :", placeHolder:"**/*.json"});
		const finds: any = await vscode.workspace.findFiles(searchQuery);
		const elements:string[]=[];
		for (const i in finds) {
			if (finds[i].scheme == "file"){
				elements.push(finds[i].path);
			}
		}
		const currentFile = await vscode.window.showQuickPick(elements, {title:"Select file :"});
		if(currentFile == undefined){
			vscode.window.showErrorMessage("No selected files.");
			return Promise.resolve();
		}
		const fileBody = await vscode.workspace.fs.readFile(vscode.Uri.file(currentFile));
		if(fileBody == undefined){
			vscode.window.showErrorMessage(`Unnable to load the file '${currentFile}'.`);
			return Promise.resolve();
		}
		const body = fileBody.toString();
		
		// Confirm box
		const confirm = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:`Confirm '${artifactType}' : '${groupId}/${artifactId}:${version}'`, canPickMany:false});
		if(confirm != "yes"){
			return Promise.resolve();
		}
		const path = _.getQueryPath({"id":null, "group":groupId}, 'group', {'ifExists':'FAIL'});
		const mimeType = mime.lookup(currentFile);
		const headers = {'X-Registry-Version': version, 'X-Registry-ArtifactId':artifactId, 'X-Registry-ArtifactType':artifactType, 'Content-Type': mimeType};
		await _.query(path, 'POST', body, headers);
		// Refresh view to display version.
		this._onDidChangeTreeData.fire(undefined);
	}

	// Search

	async search(){
		const title = "Apicurio Search Artifact By";
		const option = await vscode.window.showQuickPick(_.getQuickPickSearchOption(), {title:`${title}`, canPickMany:false});
		let search = '';
		switch (option) {
			case 'type':
				search = await vscode.window.showQuickPick(_.getArtifactTypes(), {title:`${title} ${option}`, canPickMany:false});
				break;
			case 'state':
				search = await vscode.window.showQuickPick(_.getApicurioStates(), {title:`${title} ${option}`, canPickMany:false});
				break;
			default:
				search = await vscode.window.showInputBox({title:`${title} ${option}`});
				break;
		}
		const searchReqest:Search = {attribut:option, search:search};
		Promise.resolve(this.refresh(searchReqest));
	}

	// tree data provider

	async getChildren(element?: SearchEntry): Promise<SearchEntry[]> {
		const children: SearchEntry[] = await this.readDirectory((element)? element.groupId : '');
		return Promise.resolve(children);
	}

	getTreeItem(element: SearchEntry): vscode.TreeItem {
		if(element.parent){
			// Manage display of empty results (not collapible).
			const treeItem = new vscode.TreeItem(element.groupId, (element.id) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
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
		vscode.commands.registerCommand('apicurioExplorer.search', () => treeDataProvider.search());
		vscode.commands.registerCommand('apicurioExplorer.addArtifact', () => treeDataProvider.addArtifact());
	}
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
		const version = await vscode.window.showInputBox({title:"Increment version :", placeHolder:`${this.currentArtifact.version}`});
		if(!version){
			vscode.window.showErrorMessage("No defined version.");
			return Promise.resolve();
		}
		const path = _.getQueryPath(this.currentArtifact, 'versions');
		const mimeType = mime.lookup(currentFile);
		const headers = {'X-Registry-Version': version, 'Content-Type': mimeType};
		await _.query(path, 'POST', body, headers);
		// Refresh view to display version.
		this._onDidChangeTreeData.fire(undefined);
	}

	// @TODO : Delete version
	
	async deleteArtifact(deleteVersion?:boolean){
		// Confirm box
		const confirm = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:`Are you shure to delete '${this.currentArtifact.group}/${this.currentArtifact.id}'`, canPickMany:false});
		if(confirm != "yes"){
			return Promise.resolve();
		}
		// Confirm box
		const irreversible = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:`This action is irreversible, continue ?`, canPickMany:false});
		if(irreversible != "yes"){
			return Promise.resolve();
		}
		const path = _.getQueryPath(this.currentArtifact, 'delete');
		await _.query(path, 'DELETE');
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
		const path = _.getQueryPath({group:group,id:id,version:version});
		const child:any = await _.query(path);
		return Promise.resolve(child);
	}

	// Open Artifact

	getArtifactType(): string | Thenable<string> {
		return this._getArtifactType();
	}

	async _getArtifactType(): Promise<string> {
		const path = _.getQueryPath(this.currentArtifact, 'meta');
		const child:any = await _.query(path);
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
		const path = _.getQueryPath(this.currentArtifact, 'versions');
		const children:any = await _.query(path);
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

	async refresh(): Promise<any> {
		this._onDidChangeTreeData.fire(undefined);
	}
	async refreshEntry(element:SearchEntry|VersionEntry): Promise<any> {
		this.changeCurrentArtifact(element);
		this.refresh();
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
		const path = _.getQueryPath(this.currentArtifact, 'meta');
		const children:any = await _.query(path);
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

	// Edit state

	async editState(): Promise<any>{
		if (!this._currentArtifact.id){
			vscode.window.showErrorMessage("An artifact must be selected.");
			return Promise.resolve();
		}
		// Confirm box
		const confirm = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:"Are you sure you want to edit artifact state ?", canPickMany:false});
		if(confirm != "yes"){
			return Promise.resolve();
		}
		// Select state
		const state = await vscode.window.showQuickPick(_.getApicurioStates(), {title:"Choose new artifact state", canPickMany:false});
		// No update if user escape inputbox.
		if(state == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio state edition.");
			return Promise.resolve();
		}
		// User confirmation.
		const confirmState = await vscode.window.showQuickPick(_.getApicurioStates(), {title:"Confirm new artifact state", canPickMany:false});
		if(state != confirmState){
			vscode.window.showErrorMessage("Arborted, state do not match to confirmation state.");
			return Promise.resolve();
		}
		// Manage state
		const status = await this.registryStateUpdate(state);
		// Refresh views
		vscode.commands.executeCommand('apicurioExplorer.refreshEntry');
		vscode.commands.executeCommand('apicurioVersionsExplorer.refresh');
		this._onDidChangeTreeData.fire(undefined);
		return Promise.resolve();
	}

	_getCurrentStatePath(){
		const group = this._currentArtifact.group;
		const id = this._currentArtifact.id;
		const version = this._currentArtifact.version;
		let queryPath = `groups/${group}/artifacts/${id}`;
		if(version != 'latest'){
			queryPath = `${queryPath}/versions/${version}`;
		}
		queryPath = `${queryPath}/state`;
		return queryPath;
	}
	registryStateUpdate(state): any[] | Thenable<MetaEntry[]> {
		return this._registryStateUpdate(state);
	}
	async _registryStateUpdate(state): Promise<MetaEntry[]> {
		const path = this._getCurrentStatePath();
		const body = {"state": state};
		const result:any = await _.query(path, 'PUT', body);
		return Promise.resolve(result);
	}

	// Edit metas
	
	getEditableMetas(): any[] | Thenable<MetaEntry[]> {
		return this._getEditableMetas();
	}
	async _getEditableMetas(): Promise<MetaEntry[]> {
		const query = _.getQueryPath(this.currentArtifact,'meta');
		const atrifactMetas:any = await _.query(query);
		const editableMetas:any = {};
		if(atrifactMetas.name){
			editableMetas.name = atrifactMetas.name;
		}
		if(atrifactMetas.description){
			editableMetas.description = atrifactMetas.description;
		}
		if(atrifactMetas.labels){
			editableMetas.labels = atrifactMetas.labels;
		}
		if(atrifactMetas.properties){
			editableMetas.properties = atrifactMetas.properties;
		}
		return Promise.resolve(editableMetas);
	}

	registryMetaUpdate(metaType, editableMetas, updatedValue): any[] | Thenable<MetaEntry[]> {
		return this._registryMetaUpdate(metaType, editableMetas, updatedValue);
	}
	async _registryMetaUpdate(metaType, editableMetas, updatedValue): Promise<MetaEntry[]> {
		const path = _.getQueryPath(this.currentArtifact,'meta');
		const newProperty = {[metaType]:updatedValue};
		const body = Object.assign({}, editableMetas, newProperty);
		const result:any = await _.query(path, 'PUT', body);
		return Promise.resolve(result);
	}

	async editMetas(): Promise<any>{
		if (!this._currentArtifact.id){
			vscode.window.showErrorMessage("An artifact version must be selected.");
			return Promise.resolve();
		}
		// Select meta
		const metaType = await vscode.window.showQuickPick(_.getApicurioEditableMetas(), {title:"Choose Meta to edit", canPickMany:false});
		// No update if user escape inputbox.
		if(metaType == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
			return Promise.resolve();
		}
		// Edit value 
		const editableMetas:any = await this.getEditableMetas();
		// Manage labels
		let updatedValue: any = (metaType=='labels')?[]:((metaType=='properties')?{}:'');
		const currentMetaValue: any = (editableMetas[metaType]) ? editableMetas[metaType] : ((metaType=='labels')?[]:((metaType=='properties')?{}:''));
		switch (metaType) {
			// Manage labels
			case 'labels':
				const labelAction = await vscode.window.showQuickPick(_.getQuickPickEditOption(), {title:"Choose action", canPickMany:false});
				if(labelAction == undefined){
					vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
					return Promise.resolve();
				}
				switch (labelAction) {
					case 'Delete':
						const deleteLabel = await vscode.window.showQuickPick(currentMetaValue, {title:"Choose label to delete", canPickMany:false});
						for(const i in currentMetaValue){
							if(currentMetaValue[i]!=deleteLabel){
								updatedValue.push(currentMetaValue[i]);
							}
						}
						break;
					default:
						const newLabel = await vscode.window.showInputBox({title:`Add label`});
						updatedValue = currentMetaValue;
						updatedValue.push(newLabel);
						break;
				}
				break;
				// Manage properties
				case 'properties':
					const propertyAction = await vscode.window.showQuickPick(_.getQuickPickEditOption(), {title:"Choose action", canPickMany:false});
					if(propertyAction == undefined){
						vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
						return Promise.resolve();
					}
					switch (propertyAction) {
						case 'Delete':
							const list = Object.keys(currentMetaValue);
							const deleteProperty = await vscode.window.showQuickPick(list, {title:"Choose property to delete", canPickMany:false});
							for(const i in currentMetaValue){
								if(i!=deleteProperty){
									updatedValue[i] = currentMetaValue[i];
								}
							}
							break;
						default:
							const propertyName = await vscode.window.showInputBox({title:`Add property name`});
							const propertyValue = await vscode.window.showInputBox({title:`Add property value`});
							updatedValue = currentMetaValue;
							updatedValue[propertyName] = propertyValue;
							break;
					}
					break;
			// Manage Standard Metas
			default:
				updatedValue = await vscode.window.showInputBox({title:`Update the ${metaType} value(s)`, value:currentMetaValue});
				break;
		}
		// No update if user escape inputbox.
		if(updatedValue == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
			return Promise.resolve();
		}
		// Update metas
		const confirm = await vscode.window.showQuickPick(_.getQuickPickConfirmOption(), {title:"Confirm the meta update", canPickMany:false});
		if(confirm == "yes"){
			const status = await this.registryMetaUpdate(metaType, editableMetas, updatedValue);
			// Refresh view.
			this._onDidChangeTreeData.fire(undefined);
		}
		return Promise.resolve();
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
		vscode.commands.registerCommand('apicurioMetasExplorer.refresh', () => treeDataProvider.refresh());
		vscode.commands.registerCommand('apicurioMetasExplorer.getChildren', (element) => treeDataProvider.refreshEntry(element));
		vscode.commands.registerCommand('apicurioMetasExplorer.editMetas', () => treeDataProvider.editMetas());
		vscode.commands.registerCommand('apicurioMetasExplorer.editState', () => treeDataProvider.editState());
	}
	
}