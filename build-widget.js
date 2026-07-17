const fs = require('fs-extra');
const concat = require('concat');
build = async () =>{
 const files = [
 './dist/roster-control/browser/main.js'
 ];
 
 await fs.ensureDir('widget');
 await concat(files, 'widget/roster-widget4.js');
}
build();
 
 