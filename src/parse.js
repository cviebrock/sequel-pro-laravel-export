import { argv } from 'node:process';
import MigrationParser from './MigrationParser.js';

const tableName = argv[2];
const hasForeign = argv.length === 4 ? true : false;

const m = new MigrationParser(
  tableName,
  __dirname + '/rowsStructure.tsv',
  __dirname + '/rowsKeys.tsv',
  __dirname + '/rowsConstraints.tsv',
  __dirname + '/rowsTableCharsetAndCollation.tsv',
  __dirname + '/rowsForeignStructure.tsv',
  hasForeign
);

console.log(m.makeMigration());
