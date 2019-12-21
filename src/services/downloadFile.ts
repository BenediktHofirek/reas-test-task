const https = require('https');
const unzip = require('unzip');

export function downloadFile(fileUrl:string | undefined, directory: string):Promise<void>{
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res:any)=> {
      res.pipe(unzip.Extract({ path: directory}));
              
        res.on('end', ()=> {
          console.log('resolved');
          resolve();
        });
      }).on('error', (e:any) => {
        console.error(`Got error: ${e.message}`);
        reject();
      });
  }); 
}