#!/usr/bin/env bash

DIR=$(pwd)
SRC="${DIR}/src"
BUILD="${DIR}/build"
BUNDLE_SA="ExportToLaravelMigration.saBundle"
BUNDLE_SP="ExportToLaravelMigration.spBundle"
BUILD_SA="${BUILD}/${BUNDLE_SA}"
BUILD_SP="${BUILD}/${BUNDLE_SP}"
SA_ZIP="${BUILD}/ExportToLaravelMigration-SequelAce.zip"
SP_ZIP="${BUILD}/ExportToLaravelMigration-SequelPro.zip"

# create fresh build dirs
rm -rf "${BUILD}"
mkdir -p "${BUILD}/${BUNDLE_SA}"
mkdir -p "${BUILD}/${BUNDLE_SP}"

# copy source to Sequel Ace and Sequel Pro directories
cd "${SRC}"
cp * "${BUILD}/${BUNDLE_SA}"
cp * "${BUILD}/${BUNDLE_SA}"
cd "${DIR}"

# perform required search-and-replace for Pro->Ace changes
sed -e 's/sequelpro:\/\//sequelace:\/\//g' -i "" "${BUILD}/${BUNDLE_SA}/parse.sh"

# create zip artifacts
cd "${BUILD}"
zip -9 -r "${SA_ZIP}" "./${BUNDLE_SA}"
zip -9 -r "${SP_ZIP}" "./${BUNDLE_SP}"
cd "${DIR}"
