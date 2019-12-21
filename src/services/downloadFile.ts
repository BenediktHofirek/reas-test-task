const https = require('https');
const unzip = require('unzip');

export function downloadFile(
	fileUrl: string | undefined,
	databaseName: string,
	mainCollectionName: string,
	searchTags: string[]
) {
	return new Promise((resolve, reject) => {
		https
			.get(fileUrl, (res: any) => {
				res.pipe(unzip.Parse()).on('entry', function(entry: any) {
					entry.on('readable', () => {
						console.log(entry.read().toString());
						process.exit();
					});
				});

				res.on('end', () => {
					console.log('resolved');
					resolve();
				});
			})
			.on('error', (e: any) => {
				console.error(`Got error: ${e.message}`);
				reject();
			});
	});
}
