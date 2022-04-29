import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { CurrentArtifact } from './interfaces';

export class ApicurioTools {

    /**
	 * Retrive standard list of values, could be API Enums or tooltips options.
	 * 
	 * @returns Array apicurio list.
	 */
	public getLists(type:string){
		let options = [];
		switch (type) {
			case 'confirm':
				options = ["yes","no"];
				break;
			case 'edit':
				options = ["Add", "Delete"];
				break;
			case 'add':
				options = ["NEW","EXISTING"];
				break;
			case 'search':
				options = ['name', 'group', 'description', 'type', 'state', 'labels', 'properties'];
				break;
			case 'editableMetas':
				options = ["name", "description", "labels", "properties"];
				break;
			case 'states':
				options = ["ENABLED", "DISABLED", "DEPRECATED"];
				break;
			case 'types':
				options = ["AVRO","PROTOBUF","JSON","OPENAPI","ASYNCAPI","GRAPHQL","KCONNECT","WSDL","XSD","XML"];
				break;
			default:
				break;
		}
		return options;
	}

	/**
	 * Retrive apicurio query path
	 * 
	 * @returns string
	 */
	public getQueryPath(artifact:CurrentArtifact, type?:string, params?:object){
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
	getApicurioHttpSettings(): any {
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
	public query(path: string, method?:string, body?:any, headers?:any, parse=true): Promise<string> {
		return new Promise<string>((resolve, reject) => {
		const hhttpx = (vscode.workspace.getConfiguration('apicurio.http').get('secure')) ? https : http;
		const settings = this.getApicurioHttpSettings();
		headers = (!headers) ? {'Content-Type': 'application/json', 'Accept': '*/*'}: headers;
		// FIX Apicurio isso on Yaml mime type (for OAS mostly).
		// If the type is not recognise, the entity is stored as YAML and not JSON wich is an issue for referencine entities thrue the registry across schamas
		// ex : $ref: "http://127.0.0.1.nip.io:8080/apis/registry/v2/groups/test/artifacts/test/versions/1#/components/schemas/test"
		// if (headers['Content-Type']=='application/yaml' || headers['Content-Type']=='application/yml'){
		if (headers['Content-Type'].endsWith('yaml') || headers['Content-Type'].endsWith('yml')){
			headers['Content-Type']='application/x-yaml';
		}
		const req = hhttpx.request({
			hostname: settings.hostname,
			port: settings.port,
			path: `${settings.path}${path}`,
			method: (method)? method :'GET',
			headers: headers
		}, function(res) {
			// reject on bad status
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
				case 401:
					// Fix resolution issue for 401 responses on Apicurio API
					vscode.window.showErrorMessage("Apicurio Unauthorized : you have to login or grant more permissions.");
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
			if (res.statusCode < 200 || res.statusCode >= 300) {
				vscode.window.showErrorMessage("Apicurio : retrun a "  + res.statusCode + " status code.");
				resolve('');
				return reject(new Error('statusCode=' + res.statusCode));
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
				if(parse){
					try {
						parsedData = JSON.parse(Buffer.concat(body).toString());
					} catch (e) {
						parsedData = Buffer.concat(body).toString();
					}
				}
				else{
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