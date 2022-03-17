'use strict';

import * as vscode from 'vscode';
import { SearchEntry, VersionEntry, MetaEntry, CurrentArtifact } from './interfaces';
import { ApicurioTools } from './tools';

namespace _{
	export const tools = new ApicurioTools;
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
		const path = _.tools.getQueryPath(this.currentArtifact, 'meta');
		const children:any = await _.tools.query(path);
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
		const confirm = await vscode.window.showQuickPick(_.tools.getLists('confirm'), {title:"Are you sure you want to edit artifact state ?", canPickMany:false});
		if(confirm != "yes"){
			return Promise.resolve();
		}
		// Select state
		const state = await vscode.window.showQuickPick(_.tools.getLists('states'), {title:"Choose new artifact state", canPickMany:false});
		// No update if user escape inputbox.
		if(state == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio state edition.");
			return Promise.resolve();
		}
		// User confirmation.
		const confirmState = await vscode.window.showQuickPick(_.tools.getLists('states'), {title:"Confirm new artifact state", canPickMany:false});
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
		const result:any = await _.tools.query(path, 'PUT', body);
		return Promise.resolve(result);
	}

	// Edit metas
	
	getEditableMetas(): any[] | Thenable<MetaEntry[]> {
		return this._getEditableMetas();
	}
	async _getEditableMetas(): Promise<MetaEntry[]> {
		const query = _.tools.getQueryPath(this.currentArtifact,'meta');
		const atrifactMetas:any = await _.tools.query(query);
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
		const path = _.tools.getQueryPath(this.currentArtifact,'meta');
		const newProperty = {[metaType]:updatedValue};
		const body = Object.assign({}, editableMetas, newProperty);
		const result:any = await _.tools.query(path, 'PUT', body);
		return Promise.resolve(result);
	}

	// Edit labels
	async _editLabels(currentMetaValue, updatedValue){
		const labelAction = await vscode.window.showQuickPick(_.tools.getLists('edit'), {title:"Choose action", canPickMany:false});
		if(labelAction == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
			return Promise.resolve();
		}
		let label = '';
		switch (labelAction) {
			case 'Delete':
				label = await vscode.window.showQuickPick(currentMetaValue, {title:"Choose label to delete", canPickMany:false});
				for(const i in currentMetaValue){
					if(currentMetaValue[i]!=label){
						updatedValue.push(currentMetaValue[i]);
					}
				}
				break;
			default:
				label = await vscode.window.showInputBox({title:`Add label`});
				updatedValue = currentMetaValue;
				updatedValue.push(label);
				break;
		}
		return updatedValue;
	}
	// Edit properties
	async _editProperties(currentMetaValue, updatedValue){
		const propertyAction = await vscode.window.showQuickPick(_.tools.getLists('edit'), {title:"Choose action", canPickMany:false});
		if(propertyAction == undefined){
			vscode.window.showInformationMessage("Arborted Apicurio meta edition.");
			return Promise.resolve();
		}
		let propertyName='';
		let propertyValue='';
		let deleteProperty='';
		switch (propertyAction) {
			case 'Delete':
				deleteProperty = await vscode.window.showQuickPick(Object.keys(currentMetaValue), {title:"Choose property to delete", canPickMany:false});
				for(const i in currentMetaValue){
					if(i!=deleteProperty){
						updatedValue[i] = currentMetaValue[i];
					}
				}
				break;
			default:
				propertyName = await vscode.window.showInputBox({title:`Add property name`});
				propertyValue = await vscode.window.showInputBox({title:`Add property value`});
				updatedValue = currentMetaValue;
				updatedValue[propertyName] = propertyValue;
				break;
		}
		return updatedValue;
	}
	// Edit metas

	async editMetas(): Promise<any>{
		if (!this._currentArtifact.id){
			vscode.window.showErrorMessage("An artifact version must be selected.");
			return Promise.resolve();
		}
		// Select meta
		const metaType = await vscode.window.showQuickPick(_.tools.getLists('editableMetas'), {title:"Choose Meta to edit", canPickMany:false});
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
				updatedValue = await this._editLabels(currentMetaValue, updatedValue);
				break;
				// Manage properties
				case 'properties':
				updatedValue = await this._editProperties(currentMetaValue, updatedValue);
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
		const confirm = await vscode.window.showQuickPick(_.tools.getLists('confirm'), {title:"Confirm the meta update", canPickMany:false});
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