import fs from 'node:fs';
import path from 'node:path';
import { ACGOProblemParser } from '../src/parsers/problem/ACGOProblemParser';

async function main(): Promise<void> {
  const filePath = path.resolve(__dirname, 'data/acgo/problem/normal.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const url = 'https://www.acgo.cn/problemset/info/75512?homeworkId=11803&teamCode=1927633535785422848';

  const parser = new ACGOProblemParser();
  const result = await parser.parse(url, html);

  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
