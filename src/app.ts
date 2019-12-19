const mongoose = require('mongoose');
const url = require('url');
import { getDownloadUrls } from './services/getDownloadUrls';
import { createDirectory } from './services/createDirectory';
import { deleteDirectory } from './services/deleteDirectory';
import { downloadFile } from './services/downloadFile';
import { unzipFile } from './services/unzipFile';

(async () => {
    const downloadUrls: string[] = await getDownloadUrls();

    if (!downloadUrls.length) {
        console.log('You entered wrong number');
        process.exit(1);
    }
    
    //I assume than we want to download only the latest package
    const directory = await createDirectory();
    console.log(directory);

    const lastPackageUrl = downloadUrls.pop();
    const fileName = url.parse(lastPackageUrl).pathname.split('/').pop();
    const path = directory + fileName;
    
    await downloadFile(lastPackageUrl, path).then(() => {},() => process.exit(1));
    
    unzipFile(path);
    //mongoose.connect('mongodb://localhost:27017/reas-test-case', { useNewUrlParser: true });
    
    //delete created directory
    await deleteDirectory(directory);
})()

