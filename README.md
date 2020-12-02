# Laravel Migration Exporter for Sequel Pro and Sequel Ace

A bundle for [Sequel Pro](https://www.sequelpro.com/) and
[Sequel Ace](https://sequel-ace.com/) that lets you generate 
Laravel migration files from existing tables.


## Installation

1. Download the latest release and unzip the appropriate file,
   depending on whether you are using Sequel Pro or Sequel Ace.
2. Double-click on the bundle package to install the bundle.
3. Launch Sequel Pro!


## Installation from Source

1. Clone the repository
2. Run `./build.sh` to create Sequel Pro and Sequel Ace versions of the bundle
3. Use the appropriate bundle in the `build` directory


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
who has contributed to this project!  Special thanks to 
[JetBrains](https://www.jetbrains.com/?from=cviebrock/eloquent-sluggable) for their 
Open Source License Program ... and the excellent PHPStorm IDE, of course!

[![JetBrains](./.github/jetbrains.svg)](https://www.jetbrains.com/?from=cviebrock/sequel-pro-laravel-export)

Please use [Github issues](https://github.com/cviebrock/sequel-pro-laravel-export/issues) for reporting bugs, 
and making comments or suggestions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute changes.

## Copyright and License

[sequel-pro-laravel-export](https://github.com/cviebrock/sequel-pro-laravel-export)
was written by [Colin Viebrock](http://viebrock.ca) and is released under the 
[MIT License](LICENSE.md).

Copyright (c) 2016 Colin Viebrock
