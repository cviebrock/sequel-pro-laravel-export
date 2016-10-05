# ExportToLaravelMigrations.spBundle

A bundle for [Sequel Pro](https://www.sequelpro.com/) that lets you generate Laravel migration files from existing tables.


## Installation

1. Download the latest release and unzip the file.
2. Rename the directory to remove the version name, e.g. 
   `ExportToLaravelMigration.spBundle-1.0-alpha` > `ExportToLaravelMigration.spBundle`.
   Finder will pop up a warning about changing the file extension, which is normal.  Choose
   the "Use .spBundle" option to turn the directory into a Sequel Pro bundle package.
3. Either move the `ExportToLaravelMigration.spBundle` package to `~/Library/Application Support/Sequel Pro/Bundles/`,
   or simply double-click on the `ExportToLaravelMigration.spBundle` package to install it.
4. Launch Sequel Pro!


## Usage

Connect to a database, and select a table in the left-hand column.  From the application menu, choose 
**Bundles > Open > Export to Laravel Migration**, or use the keyboard shortcut 
<kbd>CTRL</kbd> + <kbd>OPTION</kbd> + <kbd>CMD</kbd> + <kbd>M</kbd>.

The resulting Laravel migration file will be saved to your desktop.  You can then move this file into
your Laravel project (usually `/database/migrations`) and then run `artisan migrate`.


## Caveats

Auto-generated migration files will likely need manual adjustments.  Be sure to look at the code before
running `artisan migrate`!


## Bugs, Suggestions and Contributions

Thanks to [everyone](https://github.com/cviebrock/ExportToLaravelMigration.spBundle/graphs/contributors)
who has contributed to this project!

Please use [Github issues](https://github.com/cviebrock/ExportToLaravelMigration.spBundle/issues) for reporting bugs, 
and making comments or suggestions.


## Copyright and License

[ExportToLaravelMigration.spbundle](https://github.com/cviebrock/ExportToLaravelMigration.spBundle)
was written by [Colin Viebrock](http://viebrock.ca) and is released under the 
[MIT License](LICENSE.md).

Copyright (c) 2016 Colin Viebrock
