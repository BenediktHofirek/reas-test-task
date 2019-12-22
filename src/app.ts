const url = require('url');
import { getDownloadUrls } from './services/getDownloadUrls';
import { createDirectory } from './services/createDirectory';
import { deleteDirectory } from './services/deleteDirectory';
import { downloadFile } from './services/downloadFile';
import { parseFileToDatabase } from './services/parseFileToDatabase';

//variables that can possibly be dynamicaly given to programm
const databaseName = 'reasTestCaseDB';
const mainCollectionName = 'landrecords';
const searchTags = [ 'vf:Obec', 'vf:CastObce', 'vf:Ulice', 'vf:StavebniObjekt', 'vf:Parcela', 'vf:AdresniMisto' ];
const bufferSize = 64 * 1024;
const cityNumber = process.argv[2];

async function main() {
	const downloadUrls: string[] = await getDownloadUrls(cityNumber);

	if (!downloadUrls.length) {
		console.log('You entered wrong city number');
		process.exit(1);
	}

	//I assume than we want to download only the latest package
	const directory = await createDirectory();

	const newestPackageUrl = downloadUrls.pop();
	const zippedFileName = url.parse(newestPackageUrl).pathname.split('/').pop();
	const unzippedFileName = zippedFileName.slice(0, zippedFileName.length -4);

	await downloadFile(newestPackageUrl, directory).catch(() => process.exit(1));

	await parseFileToDatabase(directory+unzippedFileName, databaseName, mainCollectionName, searchTags, bufferSize);
	//delete created directory
	await deleteDirectory(directory);
}
main();
