const fs = require('fs');
const https = require('https');

export function downloadFile(fileUrl:string | undefined, path: string):Promise<void>{
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);

    https.get(fileUrl, (res:any)=> {
        res.on('data', (data:any)=> {
          file.write(data);
        });
        
        res.on('end', ()=> {
          file.end();
          resolve();
        });
      }).on('error', (e:any) => {
        console.error(`Got error: ${e.message}`);
        reject();
      });
  }); 
}