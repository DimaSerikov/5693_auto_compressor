const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

async function processFolder(folderPath) {
  console.log(`Scanning folder: ${folderPath}`);

  try {
    const items = await fsPromises.readdir(folderPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);
      
      if (item.isDirectory()) {
        await processFolder(itemPath);
      } else {
        await processFile(itemPath);
      }
    }
  } catch (err) {
    console.error(`Error scanning folder: ${folderPath}`, err);
  }
}

async function processFile(filePath) {
  const gzFilePath = `${filePath}.gz`;

  try {
    const fileStats = await fsPromises.stat(filePath);
    let gzFileStats = null;

    try {
      gzFileStats = await fsPromises.stat(gzFilePath);
    } catch {
      console.log(`Compressed file not found for: ${filePath}. Creating...`);
      await createGzipFile(filePath, gzFilePath);
      return;
    }

    if (fileStats.mtime > gzFileStats.mtime) {
      console.log(`Compressed file outdated for: ${filePath}. Recreating...`);
      await createGzipFile(filePath, gzFilePath);
    } else {
      console.log(`Compressed file is up to date: ${gzFilePath}`);
    }
  } catch (err) {
    console.error(`Error processing file: ${filePath}`, err);
  }
}

async function createGzipFile(filePath, gzFilePath) {
  console.log(`Starting compression for: ${filePath}`);

  const gzip = zlib.createGzip();
  const source = fs.createReadStream(filePath);
  const destination = fs.createWriteStream(gzFilePath);

  try {
    await pipeline(source, gzip, destination);
    console.log(`Compression completed for: ${filePath}`);
  } catch (err) {
    console.error(`Error compressing file: ${filePath}`, err);
  }
}

const folderPath = process.argv[2];

if (!folderPath) {
  console.error('Please provide a folder path as an argument.');
  process.exit(1);
}

processFolder(folderPath)
  .then(() => console.log('Processing complete.'))
  .catch((err) => console.error('Error:', err));