const AdmZip = require('adm-zip');

export function unzipFile(fileName: string):void{
   const zip = new AdmZip(fileName);
   zip.extractAllTo(fileName.substring(0,fileName.length -4));
}