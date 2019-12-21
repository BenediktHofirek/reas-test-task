const url = require('url');
const { sep } = require('path');
import { getDownloadUrls } from './services/getDownloadUrls';
import { createDirectory } from './services/createDirectory';
import { deleteDirectory } from './services/deleteDirectory';
import { downloadFile } from './services/downloadFile';
import { unzipFile } from './services/unzipFile';
import { parseFileToDatabase } from './services/parseFileToDatabase';

//variables that can possibly be dynamicaly given to programm
const databaseName = 'reasTestCaseDB';
const mainCollectionName = 'landrecords';
const searchTags = [ 'vf:Obec', 'vf:CastObce', 'vf:Ulice', 'vf:StavebniObjekt', 'vf:Parcela', 'vf:AdresniMisto' ];
const bufferSize = 64 * 1024;

async function main() {
	const downloadUrls: string[] = await getDownloadUrls();

	if (!downloadUrls.length) {
		console.log('You entered wrong number');
		process.exit(1);
	}

	//I assume than we want to download only the latest package
	const directory = await createDirectory();

	const lastPackageUrl = downloadUrls.pop();
	const fileName = url.parse(lastPackageUrl).pathname.split('/').pop();
	const path = directory + fileName;

	await downloadFile(lastPackageUrl, path).then(() => {}, () => process.exit(1));

	unzipFile(path);

	const unzippedFilePath =
		directory + fileName.slice(0, fileName.length - 4) + sep + fileName.slice(0, fileName.length - 4);

	console.log(unzippedFilePath);

	await parseFileToDatabase(unzippedFilePath, databaseName, mainCollectionName, searchTags, bufferSize);
	//delete created directory
	await deleteDirectory(directory);
	console.log('end');
}
main();
