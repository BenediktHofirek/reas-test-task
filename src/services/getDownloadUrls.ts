const https = require('https');

export function getDownloadUrls(cityNumber: string):Promise<string[]> {
	const requestUrl = `https://vdp.cuzk.cz/vdp/ruian/vymennyformat/vyhledej?vf.pu=S&_vf.pu=on&_vf.pu=on&vf.cr=U&vf.up=OB&vf.ds=Z&vf.vu=Z&_vf.vu=on&_vf.vu=on&_vf.vu=on&_vf.vu=on&vf.uo=O&ob.kod=${cityNumber}&search=Vyhledat`;
    return new Promise ((resolve, reject) => {
          https.get(requestUrl, (res: any) => {
          const { statusCode } = res;
          const contentType = res.headers['content-type'];
        
          let error;
          if (statusCode !== 200) {
            error = new Error('Request Failed.\n' +
                              `Status Code: ${statusCode}`);
          } else if (!/^text\/html/.test(contentType)) {
            error = new Error('Invalid content-type.\n' +
                              `Expected application/json but received ${contentType}`);
          }
          if (error) {
            console.error(error.message);
            // Consume response data to free up memory
            res.resume();
            return;
          }
        
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', (chunk: string) => { rawData += chunk; });
          res.on('end', () => {
            try {
                const urls = rawData.match(/https:\/\/[\w\.\/]+.zip/g);
                if (urls !== null) {
                    resolve(urls.sort());
                }
            } catch (e) {
              console.error(e.message);
              reject();
            }
          });
        }).on('error', (e:any) => {
          console.error(`Got error: ${e.message}`);
            reject();
        });
      }); 
}
