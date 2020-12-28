<?php
require_once(__DIR__ . '/MigrationParser.php');
$tableName = $argv[1];
$hasForeign = "false";
if (isset($argv[2])) {
	$hasForeign = "true";
}

$m = new MigrationParser(
    $tableName,
    __DIR__ . '/rowsStructure.tsv',
    __DIR__ . '/rowsKeys.tsv',
    __DIR__ . '/rowsConstraints.tsv',
    __DIR__ . '/rowsTableCharsetAndCollation.tsv',
    __DIR__ . '/rowsForeignStructure.tsv',
    $hasForeign
);

echo $m->makeMigration();
