const url = require('url');
const fs = require('fs');
import { getDownloadUrls } from './services/getDownloadUrls';
import { parseFileToDatabase } from './services/parseFileToDatabase';

//variables that can possibly be dynamicaly given to programm
const databaseName = 'reasTestCaseDB';
const mainCollectionName = 'landrecords';
const searchTags = [ 'vf:Obec', 'vf:CastObce', 'vf:Ulice', 'vf:StavebniObjekt', 'vf:Parcela', 'vf:AdresniMisto' ];
const cityNumber = process.argv[2];

getDownloadUrls(cityNumber).then((downloadUrls: string[]) => {
	if (!downloadUrls.length) {
		console.log('You entered wrong city number');
		process.exit(1);
	}

	const newestPackageUrl = downloadUrls.pop();
	parseFileToDatabase(newestPackageUrl, databaseName, mainCollectionName, searchTags).catch(() => {
		console.log('error while downloading or parsing file');
		process.exit(1);
	});
});
