# Laravel Migration Exporter for Sequel Pro

A bundle for [Sequel Pro](https://www.sequelpro.com/) that lets you generate Laravel migration files from existing tables.


## Installation

1. Clone the repository or download the latest release and unzip the file.
3. Double-click on the `ExportToLaravelMigration.spBundle` package within the repository directory to install the bundle.
4. Launch Sequel Pro!


## Usage

Connect to a database, and select a table in the left-hand column.  From the application menu, choose 
**Bundles › Export › Export to Laravel Migration**, or use the keyboard shortcut **⌃⌥⌘M** (that's 
<kbd>CTRL</kbd> + <kbd>OPTION</kbd> + <kbd>CMD</kbd> + <kbd>M</kbd>).

The resulting Laravel migration file will be saved in a new directory called _SequelProLaravelExport_ on your desktop.
You can then move this file into your Laravel project (usually `/database/migrations`) and then run `artisan migrate`.


## Caveats

Auto-generated migration files will likely need manual adjustments.  Be sure to look at the code before
running `artisan migrate`!


## Bugs, Suggestions and Contributions

Thanks to [everyone](https://github.com/cviebrock/sequel-pro-laravel-export/graphs/contributors)
who has contributed to this project!

Please use [Github issues](https://github.com/cviebrock/sequel-pro-laravel-export/issues) for reporting bugs, 
and making comments or suggestions.


## Copyright and License

[sequel-pro-laravel-export](https://github.com/cviebrock/sequel-pro-laravel-export)
was written by [Colin Viebrock](http://viebrock.ca) and is released under the 
[MIT License](LICENSE.md).

Copyright (c) 2016 Colin Viebrock
