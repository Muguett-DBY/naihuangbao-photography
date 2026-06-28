export function readFile(
  _filePath: string,
  callback: (error: Error) => void,
): void {
  callback(new Error("Node.js filesystem access is unavailable in the browser"));
}
