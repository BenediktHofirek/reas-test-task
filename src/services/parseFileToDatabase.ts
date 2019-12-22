const fs = require('fs');
import { Database } from './database';

export function parseFileToDatabase(
	filePath: string,
	databaseName: string,
	mainCollectionName: string,
	searchTags: string[],
	bufferSize: number
): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const { recordDate, cityNumber } = getInfo(filePath);
		interface TagRecord {
			tag: string;
			position: number;
		}

		let maxTagLength = 0;
		const documentTemplate: any = {};

		//initialize
		searchTags.forEach((tag) => {
			documentTemplate[tag] = [];
			if (tag.length > maxTagLength) {
				maxTagLength = tag.length;
			}
		});

		const db = new Database(databaseName, mainCollectionName);

		await db.openConnection()
			.then(() => console.log('Mongoose default connection open to ' + databaseName))
			.catch((err: any) => {
				console.log('Mongoose default connection error: ' + err);
				process.exit(1);
			});

		await db.deleteDocument({recordDate, cityNumber});

		await db.createDocument({ ...documentTemplate, recordDate, cityNumber })
			.catch((err: any) => {
				console.log('Cannot create document: ' + err);
				process.exit(1);
			});

		//Create readable stream
		const fileStream = fs.createReadStream(filePath, { highWaterMark: bufferSize, emitClose: true });
		fileStream.setEncoding('utf8');

		let globalData = '';
		fileStream.on('readable', () => {
			const documentUpdate = JSON.parse(JSON.stringify(documentTemplate));
			let localData = globalData;
			globalData = '';

			let chunk = '';
			while (null !== (chunk = fileStream.read())) {
				localData += chunk;
			}

			const searchResults: TagRecord[] = [];
			searchTags.forEach((tag) => {
				let position: number | undefined = 0;
				//when add ' ', we are searching for the opening tag
				while (-1 !== (position = localData.indexOf('<' + tag + ' ', position))) {
					searchResults.push({ tag, position });
					position++;
				}
			});

			searchResults.sort((a: TagRecord, b: TagRecord) => (a.position > b.position ? 1 : -1));

			//parse the tags
			searchResults.forEach((res: TagRecord, index: number) => {
				if (index === searchResults.length - 1) {
					//only the last element can have closing tag in the next buffer
					const closeTagIndex = localData.indexOf('</' + res.tag + '>', res.position);
					if (closeTagIndex === -1) {
						globalData = localData.slice(res.position);
					} else {
						// +3 because we need to count "/", ">" and we want to include the closing bracket (+1)
						const newItem = localData.slice(res.position, closeTagIndex + res.tag.length + 3);
						documentUpdate[res.tag].push({ [res.tag]: newItem });

						//at the end of chunk can be fragment of the tag, so we need to include the end in the next chunk
						//+2 because '<' and ' ' chars and +1 just for sure :-)
						globalData = localData.slice(-(maxTagLength + 3));
					}
				} else {
					const closeTagIndex = localData.indexOf('</' + res.tag + '>', res.position);
					// +3 because we need to count "/", ">" and we want to include the closing bracket (+1)
					const newItem = localData.slice(res.position, closeTagIndex + res.tag.length + 3);
					documentUpdate[res.tag].push({ [res.tag]: newItem });
				}
			});

			//save to database
			db.saveParsedData(documentUpdate, cityNumber, recordDate);
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
