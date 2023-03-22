#!/usr/bin/env bash

# set up some functions
clear_temp()
{
    rm -f "$SP_QUERY_RESULT_FILE"
    rm -f "$SP_QUERY_FILE"
    rm -f "$SP_QUERY_RESULT_STATUS_FILE"
}

execute_sql()
{
    # execute the SQL statement; the result will be available in the file $SP_QUERY_RESULT_FILE
    open "sequelpro://$SP_PROCESS_ID@passToDoc/ExecuteQuery"

    # wait for results; status file will be written to disk if query was finished
    while [ 1 ]
    do
        [[ -e "$SP_QUERY_RESULT_STATUS_FILE" ]] && break
        sleep 0.01
    done

    # check for errors
    if [ `cat "$SP_QUERY_RESULT_STATUS_FILE"` == 1 ]; then
        echo "<h2 class='err'>Query error:</h2><pre>"
        cat "$SP_QUERY_RESULT_FILE"
        echo "</pre>"
        echo "<button onclick=\"window.system.closeHTMLOutputWindow()\">Close</button>"
        exit "$SP_BUNDLE_EXIT_SHOW_AS_HTML"
    fi
}

# set up HTML styles
echo "
<style type=\"text/css\">
body, button { font-size: 15px; }
.err { color: #900; }
pre { background: #eee; border: 1px solid #ddd; padding: 15px; }
button { background: #666; color: #fff; border: 0; padding: 5px 15px; cursor: pointer; transition: all .2s ease; }
button:hover { background: #444; }
a { text-decoration: none; color: #04e; }
a::after { content: ' ➜'; opacity: 0; transition: all .2s ease; }
a:hover::after { opacity: 0.5; }
</style>
"

# start clean
clear_temp

# Check if one table is selected
if [ -z "$SP_SELECTED_TABLES" ]; then
    echo "<h2 class='err'>Error</h2><p>No table selected.</p>"
    echo "<button onclick=\"window.system.closeHTMLOutputWindow()\">Close</button>"
    exit "$SP_BUNDLE_EXIT_SHOW_AS_HTML"
fi

# build dest dir
DESTDIR=~/Desktop/SequelProLaravelExport
if mkdir -p $DESTDIR; then
    echo "<p>Output directory: <a href='SP-REVEAL-FILE://$DESTDIR'>$DESTDIR</a></p>";
else
    echo "<h2 class='err'>Error</h2><p>Could not create directory: <strong>$DESTDIR</strong></p>"
    echo "<button onclick=\"window.system.closeHTMLOutputWindow()\">Close</button>"
    exit "$SP_BUNDLE_EXIT_SHOW_AS_HTML"
fi

CONSTRAINTS_TABLE="no"

echo "
SELECT *
FROM information_schema.tables
WHERE table_schema = 'information_schema'
    AND table_name = 'REFERENTIAL_CONSTRAINTS'
LIMIT 1;"  > "$SP_QUERY_FILE"
execute_sql

if [ `cat "$SP_QUERY_RESULT_STATUS_FILE"` -gt 0 ] && [[ $(wc -l < "$SP_QUERY_RESULT_FILE") -ge 2 ]]; then
    CONSTRAINTS_TABLE="yes"
fi
clear_temp

# Split by tab
IFS=$'\t'
read -r -a tables <<< "$SP_SELECTED_TABLES"

# Loop through tables
for table in "${tables[@]}"
do

    # get the table structure, including field comments
    echo "
    SELECT
        COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, CHARACTER_SET_NAME, COLLATION_NAME, EXTRA, COLUMN_COMMENT
    FROM
        information_schema.COLUMNS
    WHERE
        TABLE_SCHEMA = '${SP_SELECTED_DATABASE}'
    AND
        TABLE_NAME = '${table}'
    ORDER BY ORDINAL_POSITION;" > "$SP_QUERY_FILE"

    # execute and save the table structure result
    execute_sql
    cp "$SP_QUERY_RESULT_FILE" "$SP_BUNDLE_PATH/rowsStructure.tsv"

    clear_temp

    # build SHOW INDEXES query
    echo "SHOW INDEXES FROM \`${table}\`" > "$SP_QUERY_FILE"

    # execute and save the SHOW INDEXES result
    execute_sql
    cp "$SP_QUERY_RESULT_FILE" "$SP_BUNDLE_PATH/rowsKeys.tsv"

    clear_temp

    # get character set and collation name
    echo "
    SELECT
        CHARACTER_SET_NAME, TABLE_COLLATION
    FROM
      information_schema.TABLES, information_schema.COLLATION_CHARACTER_SET_APPLICABILITY
    WHERE
        COLLATION_NAME = TABLE_COLLATION
    AND
        TABLE_SCHEMA = '${SP_SELECTED_DATABASE}'
    AND
        TABLE_NAME = '${table}';" > "$SP_QUERY_FILE"

    # execute and save the character set and collation name result
    execute_sql
    cp "$SP_QUERY_RESULT_FILE" "$SP_BUNDLE_PATH/rowsTableCharsetAndCollation.tsv"

    clear_temp

    if [ "$CONSTRAINTS_TABLE" == "yes" ]; then

        # check if CONSTRAINTS exists
        echo "
        SELECT count(kcu.CONSTRAINT_NAME)
        FROM
            information_schema.REFERENTIAL_CONSTRAINTS rc
        LEFT JOIN
            information_schema.KEY_COLUMN_USAGE kcu
        ON
            (rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME)
        WHERE
            kcu.CONSTRAINT_SCHEMA = '${SP_SELECTED_DATABASE}'
        AND
             rc.TABLE_NAME = '${table}';" > "$SP_QUERY_FILE"

        # check for errors
        execute_sql

    fi

    if [ "$CONSTRAINTS_TABLE" == "yes" ] && [ `cat "$SP_QUERY_RESULT_STATUS_FILE"` -gt 0 ]; then
        clear_temp

        # build CONSTRAINTS query
        echo "
        SELECT
            kcu.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.UPDATE_RULE, rc.DELETE_RULE
        FROM
            information_schema.REFERENTIAL_CONSTRAINTS rc
        LEFT JOIN
            information_schema.KEY_COLUMN_USAGE kcu
        ON
            (rc.CONSTRAINT_NAME=kcu.CONSTRAINT_NAME)
        WHERE
            kcu.CONSTRAINT_SCHEMA = '${SP_SELECTED_DATABASE}'
        AND
             rc.TABLE_NAME = '${table}';" > "$SP_QUERY_FILE"

        # save the CONSTRAINTS result
        execute_sql
        cp $SP_QUERY_RESULT_FILE "$SP_BUNDLE_PATH/rowsConstraints.tsv"
    else
        echo -n "" > "$SP_BUNDLE_PATH/rowsConstraints.tsv"
    fi


    # process the results and save to the desktop
    FILENAME=$(date "+%Y_%m_%d_%H%M%S_create_${table}_table.php")
    /usr/local/bin/node "$SP_BUNDLE_PATH/parse.js" "${table}" > $DESTDIR/$FILENAME
    echo "<p>Migration saved: <a href=\"SP-REVEAL-FILE://$DESTDIR/$FILENAME\">$FILENAME</a></p>"
    # clean up
    clear_temp

# end loop through tables
done

# ensure timestamps for any foreign key migrations occur after creation migrations
sleep 1

# Loop through tables
for table in "${tables[@]}"
do
    # get the table foreign key
    echo "SELECT
      TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME, REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME
    FROM
      INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      REFERENCED_TABLE_SCHEMA = '${SP_SELECTED_DATABASE}' AND TABLE_NAME = '${table}';" > "$SP_QUERY_FILE"

    # execute and save the table structure result
    execute_sql
    cp $SP_QUERY_RESULT_FILE "$SP_BUNDLE_PATH/rowsForeignStructure.tsv"

    hasForeignKey=`cat "$SP_BUNDLE_PATH/rowsForeignStructure.tsv" | grep -v "TABLE_NAME" | wc -l | awk '{print $1}'`;
    if [ $hasForeignKey != 0 ]; then
        FILENAME=$(date "+%Y_%m_%d_%H%M%S_add_foreign_key_to_${table}_table.php")
        /usr/local/bin/node "$SP_BUNDLE_PATH/parse.js" "${table}" "foreignkey" > $DESTDIR/$FILENAME
        echo "<p>Migration for foreign key saved: <a href=\"SP-REVEAL-FILE://$DESTDIR/$FILENAME\">$FILENAME</a></p>"
        # clean up
        clear_temp
    fi
    clear_temp
# end loop through tables
done

echo "<button onclick=\"window.system.closeHTMLOutputWindow()\">Close</button>"
exit $SP_BUNDLE_EXIT_SHOW_AS_HTML
