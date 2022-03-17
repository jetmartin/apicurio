
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

export {
    SearchEntry,
    VersionEntry,
    MetaEntry,
    CurrentArtifact,
    Search
};
