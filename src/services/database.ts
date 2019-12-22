const mongoose = require('mongoose');

export class Database {
	constructor(name: string, mainCollectionName: string) {
		this.name = name;
		this.mainCollectionName = mainCollectionName;
	}

	private name: string;
	private mainCollectionName: string;
	private collection(collection: string = this.mainCollectionName): any {
		return mongoose.connection.collection(collection);
	}

	public openConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			mongoose.connect(`mongodb://localhost:27017/${this.name}`, {
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

	//delete document in main collection if exist, because we dont want to have two same
	//records; also delete all records in another collection associated with this document
	public deleteDocument(filter: any): Promise<void> {
		return new Promise(async (resolve, reject) => {
			await this.collection().findOne(filter, (err: any, record: any) => {
				if (!err && record) {
					Object.keys(record).forEach((key: string) => {
						if (Array.isArray(record[key])) {
							mongoose.connection.collection(key).deleteMany({ _id: { $in: record[key] } });
						}
					});
				}
			});

			this.collection().deleteOne(filter, () => {
				//even if the document were not found, return successfully - there will be no similar documents
				resolve();
			});
		});
	}

	public createDocument(newDocument: any): Promise<string> {
		return new Promise(async (resolve, reject) => {
			this.collection().insertOne(newDocument, (err: any, rec: any) => {
				if (err) {
					reject();
				} else {
					resolve(rec.insertedId);
				}
			});
		});
	}

	public saveParsedData(documentUpdate: any, cityNumber: number, recordDate: string): void {
		Object.keys(documentUpdate).filter((key) => documentUpdate[key].length).forEach((key) => {
			this.collection(key).insertMany(documentUpdate[key], (err: any, insertedItem: any) => {
				if (err) {
					console.log(err);
					process.exit();
				} else {
					this.collection().updateOne(
						{ cityNumber, recordDate },
						{ $push: { [key]: { $each: Object.values(insertedItem.insertedIds) } } },
						(err: any) => {
							if (err) {
								console.log(err);
							}
						}
					);
				}
			});
		});
	}
}
