import * as fs from 'fs';
import path from 'path';

// Function to read the first line of a file synchronously
function readFirstLineSync(filePath: string) {
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const firstLine = content.split('\n')[0];
  return firstLine;
}

// Function to iterate through files in a directory
function iterateFilesSync(directoryPath: string) {
  try {
    const files = fs.readdirSync(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const firstLine = readFirstLineSync(filePath);
        console.log(`${file}: ${firstLine}`);
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }
}

// Replace 'directoryPath' with the path to the directory you want to iterate
const directoryPath = path.join(__dirname, '..', 'issues');
iterateFilesSync(directoryPath);
