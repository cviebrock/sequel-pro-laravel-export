# Changelog

## 2.0.0 - 02-Dec-2020

- Bundle now supports [Sequel Pro](https://www.sequelpro.com/)
  and [Sequel Ace](https://sequel-ace.com/)


## 1.8.1 - 26-Nov-2020

- Minor tweak to unsigned or auto-incrementing integers to use
  the more compact migration methods


## 1.8.0 - 26-Nov-2020

- Reworked handling of signed autoincrement integers and
  unsigned floating-point types (#36, thanks @nick15marketing)
- Adds support for SET columns
- Adds support for NUMERIC and FIXED columns (exported as `->decimal()`), 
  and DOUBLE PRECISION and REAL columns (exported as `->double()`)
- Table columns are now ordered in the migration the same way
  they are in the database


## 1.7.0 - 09-Mar-2020

- Adds support for timestamp columns with `ON UPDATE CURRENT_TIMESTAMP`
- Suppresses `->characterSet()` and `->collation()` on text columns
  that share the table's default character set and/or collation  
- Removes some extra blank lines from the resulting migration file
- A bit of code cleanup


## 1.6.0 - 20-Jan-2020

- Adds charset and collation information for tables/columns
- Fix for default values being double-quoted


## 1.5.0 - 24-Feb-2019

- Fixes for:
    - compound foreign keys
    - ENUM fields with default strings
    - quotes in comments


## 1.4.1 - 24-Nov-2017

- Real fix for handling FULLTEXT indices


## 1.4.0 - 21-Nov-2017

- Broken fix for FULLTEXT (version deleted)


## 1.3.1 - 01-Nov-2017

- Fix for ENUM handling and default values


## 1.3.0 - 16-Oct-2017

- Check that `REFERENTIAL_CONSTRAINTS` table exists before using it;
  should make bundle work with MySQL 5.1


## 1.2.0 - 14-Jul-2017

- Fix for listing indices when the table name is a reserved word
- Nicer output (with clickable links to generated files)
- Parsing script moved into separate bash file, rather than stored 
  in the plist (easier to maintain)


## 1.1.0 - 17-May-2017

- Added support for `tinytext()` columns
- Migrations are now saved to `~/Desktop/SequelProLaravelExport/` 
  instead of directly on the desktop


## 1.0.2 - 18-Nov-2016

- Fix for when there is more than one database with the same table name(s)


## 1.0.1 - 16-Nov-2016

- Added support for `comment()`


## 1.0.0 - 18-Oct-2016

- First stable release
- Added support for exporting multiple tables
- Fix primary keys using multiple columns
- Better handling of default values for numeric and boolean columns


## 1.0-beta.3 - 17-Oct-2016

- Added support for `json` columns
- Fixed `enum` column output
- Fixed `unsignedIncrements()` bug
- Bug fixes


## 1.0-beta.2 - 13-Oct-2016

- Better foreign key handling (cascade, etc.)
- Bug fixes


## 1.0-beta - 06-Oct-2016

## 1.0-alpha.2 - 05-Oct-2016

## 1.0-alpha - 05-Oct-2016

- Initial release
