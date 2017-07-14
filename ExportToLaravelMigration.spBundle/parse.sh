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

    # wait for Sequel Pro; status file will be written to disk if query was finished
    while [ 1 ]
    do
        [[ -e "$SP_QUERY_RESULT_STATUS_FILE" ]] && break
        sleep 0.01
    done

    # check for errors
    if [ `cat $SP_QUERY_RESULT_STATUS_FILE` == 1 ]; then
        echo "<p color=red>Query error:</p><pre>"
        cat "$SP_QUERY_FILE"
        echo "</pre>"
        exit $SP_BUNDLE_EXIT_SHOW_AS_HTML_TOOLTIP
    fi
}

# start clean
clear_temp

# Check if one table is selected
if [ -z "$SP_SELECTED_TABLES" ]; then
    echo "<p color=red>Please select a table.</p>"
    exit $SP_BUNDLE_EXIT_SHOW_AS_HTML_TOOLTIP
fi

# Split by tab
IFS=$'\t'
read -r -a tables <<< "$SP_SELECTED_TABLES"

# Loop through tables
for table in "${tables[@]}"
do

    # get the table structure, including field comments
    echo "
    SELECT
        COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
    FROM
        information_schema.COLUMNS
    WHERE
        TABLE_SCHEMA = '${SP_SELECTED_DATABASE}'
    AND
        TABLE_NAME = '${table}';" > "$SP_QUERY_FILE"

    # execute and save the table structure result
    execute_sql
    cp $SP_QUERY_RESULT_FILE "$SP_BUNDLE_PATH/rowsStructure.tsv"

    clear_temp

    # send SHOW INDEXES query to Sequel Pro
    echo "SHOW INDEXES FROM \`${table}\`" > "$SP_QUERY_FILE"

    # execute and save the SHOW INDEXES result
    execute_sql
    cp $SP_QUERY_RESULT_FILE "$SP_BUNDLE_PATH/rowsKeys.tsv"

    clear_temp

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

    if [ `cat $SP_QUERY_RESULT_STATUS_FILE` > 0 ]; then
        clear_temp

        # send CONSTRAINTS query to Sequel Pro
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
    mkdir ~/Desktop/SequelProLaravelExport
    /usr/bin/php "$SP_BUNDLE_PATH/parse.php" "${table}" > ~/Desktop/SequelProLaravelExport/$FILENAME
    echo "<p>Migration saved to <a href="file://~/Desktop/SequelProLaravelExport/">~/Desktop/SequelProLaravelExport/$FILENAME.</a></p>"

    # clean up
    clear_temp

# end loop through tables
done

exit $SP_BUNDLE_EXIT_SHOW_AS_HTML
