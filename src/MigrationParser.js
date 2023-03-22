import {
  addslashes,
  file,
  file_get_contents,
  is_numeric,
  method_exists,
  removeEmpty,
  str_replace,
  studly,
  ucfirst,
} from './helpers';

class MigrationParser {
  static version = '3.0.0';

  static TS_UPDATE_STRING = 'ON UPDATE CURRENT_TIMESTAMP';

  #structure = {};
  #keys = [];
  #constraints = [];
  #tableCharset;
  #tableCollation;
  #extras = [];

  #integerMaps = {
    int: 'integer',
    bigint: 'bigInteger',
    mediumint: 'mediumInteger',
    smallint: 'smallInteger',
    tinyint: 'tinyInteger',
  };

  #tableName;
  #structureFile;
  #keysFile;
  #constraintsFile;
  #tableCharsetAndCollationFile;
  #foreignStructureFile;
  #hasForeign = false;

  constructor(
    tableName,
    structureFile,
    keysFile,
    constraintsFile,
    tableCharsetAndCollationFile,
    foreignStructureFile,
    hasForeign
  ) {
    $this.#tableName = tableName;
    $this.#structureFile = structureFile;
    $this.#keysFile = keysFile;
    $this.#constraintsFile = constraintsFile;
    $this.#tableCharsetAndCollationFile = tableCharsetAndCollationFile;
    $this.#foreignStructureFile = foreignStructureFile;
    $this.#hasForeign = hasForeign;
  }

  makeMigration() {
    this.#buildTableCollationAndCharset();
    this.#buildStructure();
    this.#buildKeys();
    this.#buildConstraints();

    const INDENT8 = ' '.repeat(8);
    const INDENT12 = ' '.repeat(12);
    const EOL = '\n';

    const structure =
      this.#formatStructure()
        .join(EOL + INDENT12)
        .trim() + EOL;
    const keys =
      this.#formatKeys()
        .join(EOL + INDENT12)
        .trim() + EOL;
    const constraints =
      this.#formatConstraints()
        .join(EOL + INDENT12)
        .trim() + EOL;
    const tableCollationAndCharset =
      this.#formatTableCollationAndCharset()
        .join(EOL + INDENT12)
        .trim() + EOL;
    const extras =
      this.#formatExtras()
        .join(EOL + INDENT8)
        .trim() + EOL;

    let className, foreign, foreignDrop, output;

    if ($this.#hasForeign === true) {
      foreign =
        this.#formatForeign()
          .join(EOL + INDENT12)
          .trim() + EOL;
      foreignDrop =
        this.#formatForeignDrop()
          .join(EOL + INDENT12)
          .trim() + EOL;
      className = 'AddForeignKeyTo' + studly(this.#tableName) + 'Table';

      output = file_get_contents(__dirname + '/foreign_key.stub');
      output = str_replace(
        [
          ':VERSION:',
          'DummyClass',
          'DummyTable',
          '// foreign\n',
          '// foreignDrop\n',
        ],
        [
          MigrationParser.version,
          className,
          this.#tableName,
          foreign,
          foreignDrop,
        ],
        output
      );
    } else {
      className = 'Create' + studly(this.#tableName) + 'Table';
      output = file_get_contents(__dirname + '/create.stub');
      output = str_replace(
        [
          ':VERSION:',
          'DummyClass',
          'DummyTable',
          '// structure\n',
          '// keys\n',
          '// constraints\n',
          '// tableCollationAndCharset\n',
          '// extras\n',
        ],
        [
          MigrationParser.version,
          className,
          this.#tableName,
          structure,
          keys,
          constraints,
          tableCollationAndCharset,
          extras,
        ],
        output
      );
    }

    output = output.replaceAll(/^(\s*\R){2,}/m, EOL);

    return output;
  }

  #formatForeign() {
    const rows = file(this.#foreignStructureFile);
    rows.shift();

    return rows
      .map((row) => {
        [table, colName, constName, refTable, refColumnName] = row.split(
          '\t',
          5
        );
        return (
          "$table->foreign('" +
          colName.trim() +
          "')->references('" +
          refColumnName.trim() +
          "')->on('" +
          refTable.trim() +
          "');"
        );
      })
      .filter(removeEmpty);
  }

  #formatForeignDrop() {
    const rows = file(this.#foreignStructureFile);
    rows.shift();

    return rows
      .map((row) => {
        [table, colName, constName, refTable, refColumnName] = row.split(
          '\t',
          5
        );
        return (
          "$table->dropForeign('" +
          table.trim() +
          '_' +
          colName.trim() +
          "_foreign');"
        );
      })
      .filter(removeEmpty);
  }

  #buildStructure() {
    this.#structure = {};

    const rows = file(this.#structureFile);
    rows.shift();

    const re = /^(\w+)(\((.*?)\))?(.*?)?$/;
    rows.forEach((row) => {
      [
        field,
        colType,
        nullable,
        key,
        defaultValue,
        characterSet,
        collation,
        extra,
        comment,
      ] = row.split('\t');

      let matches = [...colType.matchAll(re)];
      if (matches.length > 0) {
        const type = matches[1].toLowerCase();
        const args = matches[3] ?? null;
        const typeExtra = matches[4].trim() ?? null;

        if (args.indexOf(',') === -1) {
          args = args ?? null;
        } else {
          args = args.split(',');
        }

        const data = {
          field: field,
          nullable: nullable === 'YES',
          default: defaultValue !== 'NULL' ? defaultValue : null,
          characterSet:
            characterSet !== 'NULL' && characterSet !== this.#tableCharset
              ? $characterSet
              : null,
          collation:
            collation !== 'NULL' && collation !== this.#tableCollation
              ? $collation
              : null,
          _colType: colType,
        };

        const method = 'parse' + ucfirst(type);

        if (method_exists(this, method)) {
          data = {
            ...data,
            ...this[method](type, args, typeExtra, extra),
          };
        } else {
          data.method = 'UNKNOWN:'.type;
        }

        data.comment = str_replace(['\r', '\n'], ['', ''], comment).trim();
        if (data.comment === '') {
          data.comment = null;
        }

        this.#structure[field] = data;
      }
    });

    // look for softDeletes
    if (this.#structure['deleted_at']?.method === 'timestamp') {
      this.#structure['deleted_at'].method = 'softDeletes';
      this.#structure['deleted_at'].args = null;
      this.#structure['deleted_at'].default = null;
      this.#structure['deleted_at'].nullable = false;
      this.#structure['deleted_at'].field = null;
    }

    // look for timestamps
    if (
      this.#structure['created_at']?.method === 'timestamp' &&
      this.#structure['updated_at']?.method === 'timestamp'
    ) {
      delete this.#structure['updated_at'];
      const method = this.#structure['created_at'].nullable
        ? 'nullableTimestamps'
        : 'timestamps';
      this.#structure['created_at'].method = method;
      this.#structure['created_at'].args = null;
      this.#structure['created_at'].default = null;
      this.#structure['created_at'].nullable = false;
      this.#structure['created_at'].field = null;
    }

    // look for rememberToken
    if (
      this.#structure['remember_token']?.method === 'string' &&
      this.#structure['remember_token']?.nullable === true &&
      this.#structure['remember_token']?.args === '100'
    ) {
      this.#structure['remember_token'].method = 'rememberToken';
      this.#structure['remember_token'].args = null;
      this.#structure['remember_token'].default = null;
      this.#structure['remember_token'].nullable = false;
      this.#structure['remember_token'].field = null;
    }

    // look for id
    Object.entries(this.#structure).forEach((entry) => {
      const [field, struct] = entry;
      if (
        struct.method === 'bigInteger' &&
        struct.autoIncrement === true &&
        struct.args === null
      ) {
        this.#structure[field].method = 'id';
        this.#structure[field].args = null;
        this.#structure[field].default = null;
        this.#structure[field].nullable = false;
        this.#structure[field].autoIncrement = null;
        this.#structure[field].unsigned = null;
        if (field === 'id') {
          this.#structure[field].field = null;
        }
      }
    });
  }

  #formatStructure() {
    const fields = [];

    Object.entries(this.#structure).forEach((entry) => {
      const [field, data] = entry;

      let method = data.method;
      const isNumeric = this.#isNumeric(method);
      const isInteger = this.#isInteger(method);

      if (isInteger) {
        if (data.autoIncrement) {
          method = method.replace('nteger', 'ncrements');
        } else if (data.unsigned) {
          method = 'unsigned' + ucfirst(method);
        }
      }

      if (
        method === 'timestamp' &&
        data.args === MigrationParser.TS_UPDATE_STRING
      ) {
        data.default += ' '.data.args;
        data.args = null;
      }

      let temp = '$table->' + method;
      if (data.field) {
        temp += "('" + field + "'";
        if (method === 'enum' || method === 'set') {
          temp += ', [' + to_array(data.args).join(', ') + '])';
        } else if (data.args) {
          temp += ', ' + to_array(data.args).join(', ') + ')';
        } else {
          temp += ')';
        }
      } else {
        temp += '()';
      }
      if (!isInteger) {
        if (data.autoIncrement) {
          temp += '->autoIncrement()';
        }
        if (data.unsigned) {
          temp += '->unsigned()';
        }
      }
      if (data.nullable) {
        temp += '->nullable()';
      }
      if (data.characterSet) {
        temp += "->charset('" + data.characterSet + "')";
      }
      if (data.collation) {
        temp += "->collation('" + data.collation + "')";
      }
      if (typeof data.default !== 'undefined') {
        if (
          isNumeric ||
          ((method === 'enum' || method === 'set') && is_numeric(data.default))
        ) {
          temp += '->default(' + data.default + ')';
        } else if (method === 'boolean') {
          temp += '->default('.data.default ? 'true' : 'false' + ')';
        } else if (
          data.default.trim().toUpperCase().indexOf('CURRENT_TIMESTAMP') !== -1
        ) {
          temp += "->default(DB::raw('" + data.default.trim() + "'))";
        } else {
          temp += "->default('" + this.#trimStringQuotes(data.default) + "')";
        }
      }

      // If isn't empty, set the comment
      if (data.comment !== null) {
        temp += "->comment('" + addslashes(data.comment) + "')";
      }

      fields.push(temp + ';');
    });

    return fields.filter(removeEmpty);
  }

  #buildKeys() {
    this.#keys = [];

    const rows = file(this.#keysFile);
    rows.shift();

    rows.forEach((row) => {
      [
        table,
        nonUnique,
        keyName,
        seq,
        colName,
        collation,
        cardinality,
        subPart,
        packed,
        nullable,
        indexType,
        extra,
      ] = row.split('\t', 12);

      if (indexType === 'FULLTEXT') {
        if (typeof this.#extras[keyName] === 'undefined') {
          this.#extras[keyName] = {
            method: 'fulltext',
            table: table,
            columns: new Map(),
          };
          this.#extras[keyName].columns.set(seq, colName);
        }
      } else {
        if (typeof this.#keys[keyName] === 'undefined') {
          this.#keys[keyName] = {
            method: nonUnique ? 'index' : 'unique',
            table: table,
            columns: new Map(),
          };
        }
        this.#keys[keyName].columns.set(seq, colName);
      }
    });

    // if we have a primary key ...
    if (typeof this.#keys['PRIMARY'] !== 'undefined') {
      const primary = this.#keys['PRIMARY'];
      // and it's for one columns ...
      if (primary['columns'].size === 1) {
        const primaryColumn = Array.from(primary['columns'])[0][1];
        const field = this.#structure[primaryColumn];
        // and that column is an "increments" field ...
        if (field.args?.autoIncrement === true) {
          // then don't build the primary key, since Laravel takes care of it
          delete this.#keys['PRIMARY'];
        }
      }
    }
  }

  #formatKeys() {
    const fields = [];

    Object.entries(this.#keys).forEach((entry) => {
      const [field, data] = entry;

      const columns = this.#escapeArray(data.columns);

      if (field !== 'PRIMARY') {
        fields.push(`$table->${data.method}(${columns}, '${field}');`);
      }
    });

    return fields.filter(removeEmpty);
  }

  #formatExtras() {
    const fields = [];

    Object.entries(this.#extras).forEach((entry) => {
      const [field, data] = entry;

      if (data.method === 'fulltext') {
        const columns = this.#escapeColumnList(data.columns);
        fields[
          field
        ] = `\\DB::statement("ALTER TABLE \`${data.table}\` ADD FULLTEXT INDEX \`${field}\` (${columns})");`;
      }
    });

    return fields.filter(removeEmpty);
  }

  #buildConstraints() {
    this.#constraints = [];

    const rows = file(this.#constraintsFile);
    rows.shift();

    rows.forEach((row) => {
      row = row.replace(/\n+$/, '');
      const [constraint, colName, refTable, refColumn, updateRule, deleteRule] =
        row.split('\t');

      if (this.#keys[constraint]) {
        delete this.#keys[constraint];
      }

      if (typeof this.#constraints[constraint] === undefined) {
        this.#constraints[constraint] = [];
      }
      this.#constraints[constraint].push({
        colName,
        refTable,
        refColumn,
        updateRule,
        deleteRule,
      });
    });
  }

  #formatConstraints() {
    const fields = [];

    Object.entries(this.#constraints).forEach((entry) => {
      const [field, data] = entry;

      const colNames = this.#escapeArray(data.map((entry) => entry.colName));
      const refColumns = this.#escapeArray(
        data.map((entry) => entry.refColumn)
      );

      const temp =
        '$table->foreign(' +
        colNames +
        ", '" +
        field +
        "')" +
        '->references(' +
        refColumns +
        ')' +
        "->on('" +
        data[0].refTable +
        "')" +
        "->onDelete('" +
        data[0].deleteRule +
        "')" +
        "->onUpdate('" +
        data[0].updateRule +
        "')";

      fields.push(temp + ';');
    });

    return fields.filter(removeEmpty);
  }

  #buildTableCollationAndCharset() {
    this.#constraints = [];

    const rows = file(this.#tableCharsetAndCollationFile);
    rows.shift();

    if (rows.length > 0) {
      const row = rows.shift().replaceAll(/\n+$/, '');
      [this.#tableCharset, this.#tableCollation] = row.split('\t');
    }
  }

  #formatTableCollationAndCharset() {
    const output = [];

    if (this.#tableCharset) {
      output.push("$table->charset = '" + this.#tableCharset + "';");
    }

    if (this.#tableCollation) {
      output.push("$table->collation = '" + this.#tableCollation + "';");
    }

    return output;
  }

  #escapeArray(array) {
    array = to_array(array);

    const str = array
      .map((value) => {
        if (value === 0 || isFinite(value)) {
          value = "'" + str_replace(["'"], ["\\'"], $value) + "'";
        }
      })
      .join(', ');

    if (array.length > 1) {
      return '[' + str + ']';
    }

    return str;
  }

  #escapeColumnList(array) {
    if (typeof array === 'string') {
      array = [array];
    }
    return array
      .map((value) => {
        return '`' + $value + '`';
      })
      .join(', ');
  }

  #isAutoIncrement(extra) {
    return extra.indexOf('auto_increment') !== -1;
  }

  #isUnsigned(typeExtra) {
    return typeExtra.indexOf('unsigned') !== -1;
  }

  #parseInt(type, args, typeExtra, extra) {
    return {
      method: this.#integerMaps[type],
      args: null,
      autoIncrement: this.#isAutoIncrement(extra),
      unsigned: this.#isUnsigned(typeExtra),
    };
  }

  #parseBigint(type, args, typeExtra, extra) {
    return this.#parseInt(type, args, typeExtra, extra);
  }

  #parseMediumint(type, args, typeExtra, extra) {
    return this.#parseInt(type, args, typeExtra, extra);
  }

  #parseSmallint(type, args, typeExtra, extra) {
    return this.#parseInt(type, args, typeExtra, extra);
  }

  #parseTinyint(type, args, typeExtra, extra) {
    if (args === 1) {
      method = 'boolean';
      args = null;
      unsigned = false;

      return { method, args, unsigned };
    }

    return this.#parseInt(type, args, typeExtra, extra);
  }

  #parseBlob(type, args, typeExtra, extra) {
    return this.#defaultParse('binary', args);
  }

  #parseChar(type, args, typeExtra, extra) {
    return this.#defaultParse('char', args);
  }

  #parseDate(type, args, typeExtra, extra) {
    return this.#defaultParse(date);
  }

  #parseDatetime(type, args, typeExtra, extra) {
    return this.#defaultParse('dateTime');
  }

  #parseDecimal(type, args, typeExtra, extra) {
    return {
      method: 'decimal',
      args: args,
      unsigned: this.#isUnsigned(typeExtra),
    };
  }

  #parseNumeric(type, args, typeExtra, extra) {
    return this.#parseDecimal(type, args, typeExtra, extra);
  }

  #parseFixed(type, args, typeExtra, extra) {
    return this.#parseDecimal(type, args, typeExtra, extra);
  }

  #parseDouble(type, args, typeExtra, extra) {
    return {
      method: 'double',
      args: args,
      unsigned: this.#isUnsigned(typeExtra),
    };
  }

  #parseDoublePrecision(type, args, typeExtra, extra) {
    return this.#parseDouble(type, args, typeExtra, extra);
  }

  #parseReal(type, args, typeExtra, extra) {
    return this.#parseDouble(type, args, typeExtra, extra);
  }

  #parseFloat(type, args, typeExtra, extra) {
    return {
      method: 'float',
      args: args,
      unsigned: this.#isUnsigned(typeExtra),
    };
  }

  #parseLongtext(type, args, typeExtra, extra) {
    return this.#defaultParse('longText', args);
  }

  #parseMediumtext(type, args, typeExtra, extra) {
    return this.#defaultParse('mediumText', args);
  }

  #parseTinytext(type, args, typeExtra, extra) {
    return this.#defaultParse('tinyText', args);
  }

  #parseText(type, args, typeExtra, extra) {
    return this.#defaultParse('text', args);
  }

  #parseVarchar(type, args, typeExtra, extra) {
    return this.#defaultParse('string', args);
  }

  #parseEnum(type, args, typeExtra, extra) {
    return this.#defaultParse('enum', args);
  }

  #parseSet(type, args, typeExtra, extra) {
    return this.#defaultParse('set', args);
  }

  #parseTime(type, args, typeExtra, extra) {
    return this.#defaultParse('time', args);
  }

  #parseTimestamp(type, args, typeExtra, extra) {
    if (extra.toUpperCase().indexOf(MigrationParser.TS_UPDATE_STRING) !== -1) {
      args = MigrationParser.TS_UPDATE_STRING;
    }
    return this.#defaultParse('timestamp', args);
  }

  #parseJson(type, args, typeExtra, extra) {
    return this.#defaultParse('json', args);
  }

  #defaultParse(method, args = null) {
    return { method, args };
  }

  #trimStringQuotes(str) {
    return str
      .replace(/^["']+/, '')
      .replace(/["']+$/, '')
      .trim();
  }

  #isInteger(method) {
    return method.toLowerCase().indexOf('integer') !== -1;
  }

  #isNumeric(method) {
    return (
      this.#isInteger(method) ||
      method === 'decimal' ||
      method === 'double' ||
      method === 'float' ||
      method === 'real'
    );
  }
}

export default MigrationParser;
