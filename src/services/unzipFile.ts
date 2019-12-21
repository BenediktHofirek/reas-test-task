const unzip = require('unzip');
const fs = require('fs');
const { sep } = require('path');

export function unzipFile(path: string, bufferSize: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const unzippedFileFolder = path.slice(0, path.lastIndexOf(sep));
		const fileStream = fs
			.createReadStream(path, { highWaterMark: bufferSize, emitClose: true })
			.pipe(unzip.Extract({ path: unzippedFileFolder }));

		fileStream.on('close', () => {
			resolve(unzippedFileFolder + path.slice(path.lastIndexOf(sep), path.length - 4));
		});

		fileStream.on('error', () => {
			reject();
		});
	});
}
