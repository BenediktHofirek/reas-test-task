const mongoose = require('mongoose');
const fs = require('fs');

export async function parseFileToDatabase(filePath: string, databaseName: any):Promise<void> {
	const {recordDate, cityNumber} = getInfo(filePath);
	interface TagRecord {
		tag: string;
		position: number;
	}

	const searchTags = [ 'vf:Obec', 'vf:CastObce', 'vf:Ulice', 'vf:StavebniObjekt', 'vf:Parcela', 'vf:AdresniMisto' ];

	let maxTagLength = 0;
	const documentTemplate: any = {};
	const schemaObject: any = {};

	//initialize
	searchTags.forEach((tag) => {
		documentTemplate[tag] = [];
		schemaObject[tag] = Array;
		if (tag.length > maxTagLength) {
			maxTagLength = tag.length;
		}
	});

	await openDatabaseConnection(databaseName)
		.then(() => console.log('Mongoose default connection open to ' + databaseName))
		.catch((err: any) => console.log('Mongoose default connection error: ' + err));

	//create document model
	const landRecordSchema = new mongoose.Schema({ ...schemaObject, cityNumber: Number, recordDate: String });
	const LandRecord = mongoose.model('LandRecord', landRecordSchema);

	//Create stream; highWaterMark is set to default size, but it can be changed anytime
	const fileStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 64,  });
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
		saveToDatabase(documentUpdate, LandRecord, cityNumber,recordDate);
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

function saveToDatabase(documentUpdate: any, model: any, cityNumber: number, recordDate: string): void {
	const updateObject: any = {};
	for(let [key, value] of Object.entries(documentUpdate)){
		updateObject[key] = {$each: value}
	}
	model.updateOne({cityNumber, recordDate},{ $push: updateObject },{ upsert: true });
}

function getInfo(path:string):{cityNumber: number, recordDate: string}{
	const result = path.match(/.+\/(\d+)_[A-Z]+_(\d+)_[A-Z]+\.xml$/) || [];
	console.log(result);
	return {recordDate: result[1], cityNumber: Number(result[2])}
}
