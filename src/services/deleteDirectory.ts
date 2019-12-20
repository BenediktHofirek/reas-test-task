const fs = require('fs');
const { sep } = require('path');

export async function deleteDirectory(directory: string): Promise<boolean> {
	const files: string[] = await new Promise((resolve, reject) => {
		fs.readdir(directory, (err: any, files: string[]) => {
			if (err) {
				console.log(err);
				reject();
			} else {
				resolve(files);
			}
		});
	});

	if (files.length) {
		let counter = 0;
		return new Promise((resolve, reject) => {
			files.forEach((file: string) => {
				const path = directory + file;
				fs.stat(path, async (err: any, stats: any) => {
					if (err) {
						console.log(err, 'ERROR');
					} else if (stats.isDirectory()) {
						const res = await deleteDirectory(path + sep);
						counter++;
						if (counter === files.length) {
							resolve(deletePromise(directory));
						}
					} else {
						fs.unlink(path, (err: any) => {
							if (err) throw err;
							counter++;
							if (counter === files.length) {
								resolve(deletePromise(directory));
							}
						});
					}
				});
			});
		});
	} else {
		return deletePromise(directory);
	}
}

function deletePromise(directory: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		fs.rmdir(directory, (err: any) => {
			if (err) {
				console.log(err);
			}
			resolve(true);
		});
	});
}
