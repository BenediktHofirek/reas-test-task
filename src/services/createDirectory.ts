const os = require('os');
const fs = require('fs');
const { sep } = require('path');

export function createDirectory():Promise<string>{
    const tmpDir = os.tmpdir();
    
    return new Promise((resolve, reject) => {
        fs.mkdtemp(`${tmpDir}${sep}`, (err:any, folder:string) => {
          if (err) {
              throw err;
          } else {
              resolve(folder + sep);
          }
        });
    });
}