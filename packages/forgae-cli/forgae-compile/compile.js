/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */

require = require('esm')(module /*, options */) // use to handle es6 import/export
const {
    printError,
    print,
    readFile
} = require('forgae-utils');
const utils = require('forgae-utils');
const config = require('forgae-config');

async function compileAndPrint (file, options) {
    print('\r')
    
    try {
        const code = readFile(file);
        const bytecode = await utils.contractCompile(code.toString(), options);

        print(`Contract '${ file } has been successfully compiled'`)
        print(`Contract bytecode: ${ bytecode }`)
    } catch (error) {
        printError(`Contract '${ file } has not been compiled'`)
        printError(`reason:`)
        printError(error.message || error)
    }

    print('\r')
}

async function run (path, compiler = config.compilerUrl) {

    print('===== Compiling contracts =====');

    const options = {
        compilerUrl: compiler
    }

    if (path.includes('.aes')) {
        compileAndPrint(path, options)
    } else {
        const files = await utils.getFiles(`${ process.cwd() }/${ path }/`, `.*\.(aes)`);

        files.forEach(async (file) => {
            compileAndPrint(file, options)
        });
    }
}

module.exports = {
    run
}