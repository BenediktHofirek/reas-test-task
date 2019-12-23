export function parseTags(parsedTags: any, dataToParse: string, searchTags: string[], maxTagLength: number): string {
	interface TagRecord {
		tag: string;
		position: number;
	}

	const searchResults: TagRecord[] = [];
	searchTags.forEach((tag) => {
		let position: number | undefined = 0;
		//when add ' ', we are searching for the opening tag
		while (-1 !== (position = dataToParse.indexOf('<' + tag + ' ', position))) {
			searchResults.push({ tag, position });
			position++;
		}
	});

	searchResults.sort((a: TagRecord, b: TagRecord) => (a.position > b.position ? 1 : -1));

	let leftOverData = '';
	//parse tags
	searchResults.forEach((res: TagRecord, index: number) => {
		if (index === searchResults.length - 1) {
			//only the last element can have closing tag in the next buffer
			const closeTagIndex = dataToParse.indexOf('</' + res.tag + '>', res.position);
			if (closeTagIndex === -1) {
				leftOverData = dataToParse.slice(res.position);
			} else {
				// +3 because we need to count "/", ">" and we want to include the closing bracket (+1)
				const newItem = dataToParse.slice(res.position, closeTagIndex + res.tag.length + 3);
				parsedTags[res.tag].push({ [res.tag]: newItem });

				//at the end of chunk can be fragment of the tag, so we need to include the end in the next chunk
				//+2 because '<' and ' ' chars and +1 just for sure :-)
				leftOverData = dataToParse.slice(-(maxTagLength + 3));
			}
		} else {
			const closeTagIndex = dataToParse.indexOf('</' + res.tag + '>', res.position);
			// +3 because we need to count "/", ">" and we want to include the closing bracket (+1)
			const newItem = dataToParse.slice(res.position, closeTagIndex + res.tag.length + 3);
			parsedTags[res.tag].push({ [res.tag]: newItem });
		}
	});
	
	return leftOverData;
	//just for typescript, this return cannot occur
}
