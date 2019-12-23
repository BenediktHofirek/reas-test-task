const fs = require('fs');
import { Database } from './database';
import { parseTags } from './parseTags';

export function parseFileToDatabase(
	filePath: string,
	databaseName: string,
	mainCollectionName: string,
	searchTags: string[],
	bufferSize: number
): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const { recordDate, cityNumber } = getInfo(filePath);

		let maxTagLength = 0;
		const parsedTagsTemplate: any = {};

		//initialize
		searchTags.forEach((tag) => {
			parsedTagsTemplate[tag] = [];
			if (tag.length > maxTagLength) {
				maxTagLength = tag.length;
			}
		});

		const db = new Database(databaseName, mainCollectionName);

		await db
			.openConnection()
			.then(() => console.log('Mongoose default connection open to ' + databaseName))
			.catch((err: any) => {
				console.log('Mongoose default connection error: ' + err);
				process.exit(1);
			});

		await db.deleteDocument({ recordDate, cityNumber });

		await db.createDocument({ ...parsedTagsTemplate, recordDate, cityNumber }).catch((err: any) => {
			console.log('Cannot create document: ' + err);
			process.exit(1);
		});

		let globalData = '';

		//Create readable stream
		const fileStream = fs.createReadStream(filePath, { highWaterMark: bufferSize, emitClose: true });
		fileStream.setEncoding('utf8');

		let counter = 0;
		fileStream.on('data', async (chunk: string) => {
			fileStream.pause();
			let x = counter++;
			console.log('start', x);
			const parsedTags = JSON.parse(JSON.stringify(parsedTagsTemplate));
			let localData = globalData + chunk;
			globalData = '';

			//parsedTags are mutate in the function
			globalData = parseTags(parsedTags, localData, searchTags, maxTagLength);
			console.log('pruchod2');
			//save to database
			await db.saveParsedData(parsedTags, cityNumber, recordDate);
			console.log('end', x);
			fileStream.resume();
		});

		fileStream.on('close', () => {
			resolve();
		});
	});
}

function getInfo(path: string): { cityNumber: number; recordDate: string } {
	const result = path.match(/.+\/(\d+)_[A-Z]+_(\d+)_[A-Z]+\.xml$/) || [];
	return { recordDate: result[1], cityNumber: Number(result[2]) };
}
