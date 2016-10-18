<?php

require_once(__DIR__ . '/MigrationParser.php');

$tableName = $argv[1];

$m = new MigrationParser($tableName,
    __DIR__ . '/rowsStructure.tsv',
    __DIR__ . '/rowsKeys.tsv',
    __DIR__ . '/rowsConstraints.tsv'
);

echo $m->makeMigration();
