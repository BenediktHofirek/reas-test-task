const mongoose = require('mongoose');
const fs = require('fs');

export function parseFileToDatabase(filePath: string, databaseName: string): Promise<void> {
	return new Promise(async (resolve, reject) => {
		const { recordDate, cityNumber } = getInfo(filePath);
		interface TagRecord {
			tag: string;
			position: number;
		}

		const searchTags = [
			'vf:Obec',
			'vf:CastObce',
			'vf:Ulice',
			'vf:StavebniObjekt',
			'vf:Parcela',
			'vf:AdresniMisto'
		];

		let maxTagLength = 0;
		const documentTemplate: any = {};
		const schemaObject: any = {};

		//create document model
		const landRecordSchema = new mongoose.Schema({ ...schemaObject, cityNumber: Number, recordDate: String });
		const model: any = {
			landrecords: mongoose.model('landrecords', landRecordSchema)
		};

		//initialize
		searchTags.forEach((tag) => {
			documentTemplate[tag] = [];
			schemaObject[tag] = mongoose.Schema.Types.Array;
			if (tag.length > maxTagLength) {
				maxTagLength = tag.length;
			}
		});

		await openDatabaseConnection(databaseName)
			.then(() => console.log('Mongoose default connection open to ' + databaseName))
			.catch((err: any) => {
				console.log('Mongoose default connection error: ' + err);
				process.exit(1);
			});

		await createDocument(model, { ...documentTemplate, recordDate, cityNumber }).catch((err: any) => {
			console.log('Cannot create document: ' + err);
			process.exit(1);
		});

		//Create stream; highWaterMark is set to default size, but it can be changed anytime
		const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 64, emitClose: true });
		fileStream.setEncoding('utf8');

		let globalData = '';
		fileStream.on('readable', function() {
			const documentUpdate = Object.assign({}, documentTemplate);
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
						documentUpdate[res.tag].push(newItem);

						//at the end of chunk can be fragment of the tag, so we need to include the end in the next chunk
						//+3 because '<' and ' ' chars and +1 just for sure :-)
						globalData = localData.slice(-(maxTagLength + 3));
					}
				} else {
					const closeTagIndex = localData.indexOf('</' + res.tag + '>', res.position);
					// +3 because we need to count "/", ">" and we want to include the closing bracket (+1)
					const newItem = localData.slice(res.position, closeTagIndex + res.tag.length + 3);
					documentUpdate[res.tag].push(newItem);
				}
			});

			//save to database
			saveToDatabase(documentUpdate, model, cityNumber, recordDate);
		});

		fileStream.on('close', () => {
			resolve();
		});
	});
}

function openDatabaseConnection(databaseName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		mongoose.connect(`mongodb://localhost:27017/${databaseName}`, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		// When successfully connected
		mongoose.connection.on('connected', function() {
			resolve();
		});

		// If the connection throws an error
		mongoose.connection.on('error', function(err: any) {
			reject(err);
		});
	});
}

function createDocument(model: any, firstDocument: any): Promise<void> {
	return new Promise((resolve, reject) => {
		const { cityNumber, recordDate } = firstDocument;
		const collectionName = Object.keys(model)[0];
		
		//delete document if exist, because we want not to have two documents with same data
		model[collectionName].deleteOne({ cityNumber, recordDate }, () => {
			mongoose.connection.collection(collectionName).insertOne(firstDocument, (err: any, rec: any) => {
				if (err) {
					reject();
				} else {
					resolve();
				}
			});
		});
	});
}

function saveToDatabase(documentUpdate: any, model: any, cityNumber: number, recordDate: string): void {
	const mainCollectionName = Object.keys(model)[0];
	Object.keys(documentUpdate).forEach((key) => {
		documentUpdate[key].forEach((value: string[]) => {
			mongoose.connection.collection(key).insertOne({ [key]: value }, (err: any, insertedItem: any) => {
				if (err) {
					console.log('errr', err);
				} else {
					mongoose.connection.collection(mainCollectionName).updateOne(
						{ cityNumber, recordDate },
						{ $push: { [key]: insertedItem.insertedId } },
						(err: any) => {
							if (err) {
								console.log(err);
							}
						}
					);
				}
			});
		});
	});
}

function getInfo(path: string): { cityNumber: number; recordDate: string } {
	const result = path.match(/.+\/(\d+)_[A-Z]+_(\d+)_[A-Z]+\.xml$/) || [];
	return { recordDate: result[1], cityNumber: Number(result[2]) };
}
