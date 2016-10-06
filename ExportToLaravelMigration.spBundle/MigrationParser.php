<?php

class MigrationParser
{

    /**
     * @var array
     */
    protected $structure = [];

    /**
     * @var array
     */
    protected $indexes = [];

    /**
     * @var array
     */
    protected $integerMaps = [
        'int'       => 'integer',
        'bigint'    => 'bigInteger',
        'mediumint' => 'mediumInteger',
        'smallint'  => 'smallInteger',
        'tinyint'   => 'tinyInteger',
    ];

    /**
     * @var string
     */
    protected $tableName;

    /**
     * @var string
     */
    protected $structureFile;

    /**
     * @var string
     */
    protected $indexesFile;

    public function __construct($tableName, $structureFile, $indexesFile)
    {
        $this->tableName = $tableName;
        $this->structureFile = $structureFile;
        $this->indexesFile = $indexesFile;
    }

    public function makeMigration()
    {
        $this->buildStructure();
        $this->buildIndexes();

        $indent = str_repeat(' ', 12);
        $eol = "\n";

        $structure = implode($eol . $indent, $this->formatStructure()) . $eol;
        $indexes = implode($eol . $indent, $this->formatIndexes()) . $eol;

        $output = file_get_contents(__DIR__ . '/create.stub');

        $className = 'Create' . $this->studly($this->tableName) . 'Table';
        $file = '@file database/migrations/' . @date('Y_m_d_His') . '_create_' . strtolower($this->tableName) . '_table.php';

        $output = str_replace(
            ['DummyClass', 'DummyTable', '// structure', '// indexes', '@date', '@file'],
            [$className, $this->tableName, $structure, $indexes, $date, $file],
            $output
        );

        return $output;
    }

    protected function studly($value)
    {
        $value = ucwords(str_replace(['-', '_'], ' ', $value));

        return str_replace(' ', '', $value);
    }

    public function buildStructure()
    {
        $this->structure = [];

        $rows = file($this->structureFile);
        array_shift($rows);

        foreach ($rows as $row) {

            list($field, $colType, $null, $key, $default, $extra) = explode("\t", $row);

            if (preg_match('#^(\w+)(\((.*?)\))?(.*?)?$#', $colType, $matches)) {

                $type = strtolower($matches[1]);
                $args = $matches[3] ?: null;
                $typeExtra = trim($matches[4]) ?: null;

                if (strpos($args, ',') === false) {
                    $args = $args ?: null;
                } else {
                    $args = explode(',', $args);
                }

                $data = [
                    'field'    => $field,
                    'nullable' => ($null === 'YES'),
                    'default'  => ($default !== 'NULL') ? $default : null,
                    '_colType' => $colType,
                ];

                $method = 'parse' . ucfirst($type);

                if (method_exists($this, $method)) {
                    $data = array_merge(
                        $data,
                        $this->{$method}($type, $args, $typeExtra, $extra)
                    );
                } else {
                    $data['method'] = 'UNKNOWN:' . $type;
                }

                $this->structure[$field] = $data;
            }
        }

        // look for softDeletes
        if (
            array_key_exists('deleted_at', $this->structure)
            && $this->structure['deleted_at']['method'] === 'timestamp'
        ) {
            $this->structure['deleted_at']['method'] = 'softDeletes';
            $this->structure['deleted_at']['args'] = null;
            $this->structure['deleted_at']['default'] = null;
            $this->structure['deleted_at']['nullable'] = false;
            $this->structure['deleted_at']['field'] = null;
        }

        // look for timestamps
        if (
            array_key_exists('created_at', $this->structure)
            && $this->structure['created_at']['method'] === 'timestamp'
            && array_key_exists('updated_at', $this->structure)
            && $this->structure['updated_at']['method'] === 'timestamp'
        ) {
            unset($this->structure['updated_at']);
            $method = $this->structure['created_at']['nullable'] ? 'nullableTimestamps' : 'timestamps';
            $this->structure['created_at']['method'] = $method;
            $this->structure['created_at']['args'] = null;
            $this->structure['created_at']['default'] = null;
            $this->structure['created_at']['nullable'] = false;
            $this->structure['created_at']['field'] = null;
        }

        // look for rememberToken
        if (
            array_key_exists('remember_token', $this->structure)
            && $this->structure['remember_token']['method'] === 'string'
            && $this->structure['remember_token']['nullable'] === true
            && $this->structure['remember_token']['args'] === '100'
        ) {
            $this->structure['remember_token']['method'] = 'rememberToken';
            $this->structure['remember_token']['args'] = null;
            $this->structure['remember_token']['default'] = null;
            $this->structure['remember_token']['nullable'] = false;
            $this->structure['remember_token']['field'] = null;
        }
    }

    public function formatStructure()
    {
        $fields = [];
        foreach ($this->structure as $field => $data) {
            $temp = '$table->' . $data['method'];
            if ($data['field']) {
                $temp .= '(\'' . $field . '\'';
                if ($data['args']) {
                    $temp .= ', ' . implode(', ', (array)$data['args']) . ')';
                } else {
                    $temp .= ')';
                }
            } else {
                $temp .= '()';
            }
            if ($data['nullable']) {
                $temp .= '->nullable()';
            }
            if ($data['default']) {
                $temp .= '->default(\'' . $data['default'] . '\')';
            }

            $fields[$field] = $temp . ';';
        }

        return $fields;
    }

    public function buildIndexes()
    {
        $this->indexes = [];

        $rows = file($this->indexesFile);
        array_shift($rows);

        foreach ($rows as $row) {
            list($table, $nonUnique, $keyName, $seq, $colName, $extra) = explode("\t", $row, 6);

            if ($keyName === 'PRIMARY') {

                $field = $this->structure[$colName];
                if ($field['method'] === 'increments' || $field['method'] === 'bigIncrements') {
                    // skip setting a primary index, as the increments method does that
                } else {
                    $this->indexes[$colName] = [
                        'method' => 'primary',
                    ];
                }

                continue;
            }

            if (!array_key_exists($keyName, $this->indexes)) {
                $this->indexes[$keyName] = [
                    'method'  => $nonUnique ? 'index' : 'unique',
                    'columns' => [],
                ];
            }
            $this->indexes[$keyName]['columns'][$seq] = $colName;
        }
    }

    public function formatIndexes()
    {
        $fields = [];
        foreach ($this->indexes as $field => $data) {
            $temp = '$table->' . $data['method'];
            $columns = $this->escapeArray($data['columns']);
            $temp .= '(' . $columns . ', \'' . $field . '\')';

            $fields[$field] = $temp . ';';
        }

        return $fields;
    }

    protected function copyToClipboard($content)
    {
        $cmd = 'echo ' . escapeshellarg($content) . ' | __CF_USER_TEXT_ENCODING=' . posix_getuid() . ':0x8000100:0x8000100 pbcopy';
        shell_exec($cmd);
    }

    protected function extractSize($string)
    {
        if (preg_match('#\(([^)]+)\)#', $string, $m)) {
            return $m[1];
        }
    }

    protected function escapeArray($array)
    {
        $array = (array)$array;
        array_walk($array, function(&$value, $idx) {
            if (!is_numeric($value)) {
                $value = '\'' . str_replace('\'', '\\\'', $value) . '\'';
            }
        });

        $string = implode(', ', $array);

        if (count($array) > 1) {
            return '[' . $string . ']';
        }

        return $string;
    }

    protected function parseInt($type, $args, $typeExtra, $extra)
    {
        if (strpos($extra, 'auto_increment') !== false) {
            $method = 'increments';
        } else {
            $method = $this->integerMaps[$type];
        }
        $unsigned = strpos($typeExtra, 'unsigned') !== false;
        $args = null;

        return compact('method', 'args', 'unsigned', 'nullable');
    }

    protected function parseBigint($type, $args, $typeExtra, $extra)
    {
        $data = $this->parseInt($type, $args, $typeExtra, $extra);
        if (strpos($extra, 'auto_increment') !== false) {
            $data['method'] = 'bigIncrements';
        }

        return $data;
    }

    protected function parseMediumint($type, $args, $typeExtra, $extra)
    {
        return $this->parseInt($type, $args, $typeExtra, $extra);
    }

    protected function parseSmallint($type, $args, $typeExtra, $extra)
    {
        return $this->parseInt($type, $args, $typeExtra, $extra);
    }

    protected function parseTinyint($type, $args, $typeExtra, $extra)
    {
        if ($args === 1) {
            $method = 'boolean';
            $args = $unsigned = null;

            return compact('method', 'args', 'unsigned', 'nullable');
        }

        return $this->parseInt($type, $args, $typeExtra, $extra);
    }

    protected function parseBlob($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('binary', $args);
    }

    protected function parseChar($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('char', $args);
    }

    protected function parseDate($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('date');
    }

    protected function parseDatetime($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('dateTime');
    }

    protected function parseDecimal($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('decimal', $args);
    }

    protected function parseDouble($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('double', $args);
    }

    protected function parseFloat($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('float', $args);
    }

    protected function parseLongtext($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('longText', $args);
    }

    protected function parseMediumtext($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('mediumText', $args);
    }

    protected function parseText($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('text', $args);
    }

    protected function parseVarchar($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('string', $args);
    }

    protected function parseEnum($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('enum', $args);
    }

    protected function parseTime($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('time', $args);
    }

    protected function parseTimestamp($type, $args, $typeExtra, $extra)
    {
        return $this->defaultParse('timestamp', $args);
    }

    private function defaultParse($method, $args = null)
    {
        return compact('method', 'args');
    }
}
