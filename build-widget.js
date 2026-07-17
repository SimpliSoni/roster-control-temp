const fs = require('fs-extra');
const concat = require('concat');

(async function build() {
  // Read package.json to get and increment version
  const pkg = await fs.readJson('./package.json');
  let [major, minor, patch] = pkg.version.split('.').map(Number);
  
  // Increment minor version (6.1 -> 6.2)
  minor++;
  const newVersion = `${major}.${minor}.${patch}`;
  const displayVersion = `${major}.${minor}`;
  
  // Update package.json
  pkg.version = newVersion;
  await fs.writeJson('./package.json', pkg, { spaces: 2 });

  const files = ['./dist/roster-control/browser/main.js'];
  const outputFileName = `roster-control-v${displayVersion}.js`;
  const outputPath = `widget/${outputFileName}`;

  await fs.ensureDir('widget');
  await concat(files, outputPath);

  // Update widget.html with new script source
  let widgetHtml = await fs.readFile('widget.html', 'utf8');
  widgetHtml = widgetHtml.replace(/roster-control-v\d+\.\d+\.js/, outputFileName);
  await fs.writeFile('widget.html', widgetHtml);

  console.log(`Build completed: ${outputPath}`);
  console.log(`Version bumped to ${newVersion} in package.json and widget.html`);
})();