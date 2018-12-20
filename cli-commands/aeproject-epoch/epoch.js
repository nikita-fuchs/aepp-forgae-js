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
  print
} = require('./../utils');
const utils = require('../utils');
const {
  spawn
} = require('promisify-child-process');
const dockerCLI = require('docker-cli-js');
const docker = new dockerCLI.Docker();
const epochConfig = require('./config.json')
const config = epochConfig.config;
const defaultWallets = epochConfig.defaultWallets;

async function dockerPs() {
  let running = false

  await docker.command('ps', function (err, data) {
    if (err) {
      throw new Error(err);
    }

    data.containerList.forEach(function (container) {
      if (container.image.startsWith("aeternity") && container.status.indexOf("healthy") != -1) {
        running = true;
      }
    })
  });
  return running;
}

async function fundWallets() {
  await waitToMineCoins()

  let walletIndex = 0;
  let client = await utils.getClient(config.host);
  await printBeneficiaryKey(client);
  for (let wallet in defaultWallets) {

    await fundWallet(client, defaultWallets[wallet].publicKey)
    await printWallet(client, defaultWallets[wallet], `#${walletIndex++}`)
  }
}

async function printBeneficiaryKey(client) {
  await printWallet(client, config.keyPair, "Miner")
}

async function printWallet(client, keyPair, label) {
  let keyPairBalance = await client.balance(keyPair.publicKey)

  print(`${label} ------------------------------------------------------------`)
  print(`public key: ${keyPair.publicKey}`)
  print(`private key: ${keyPair.secretKey}`)
  print(`Wallet's balance is ${keyPairBalance}`);
}

async function waitToMineCoins() {
  let client = await utils.getClient(config.host);
  await client.awaitHeight(8)
}

async function fundWallet(client, recipient) {

  client.setKeypair(config.keyPair)
  await client.spend(config.amountToFund, recipient)

}

async function run(option) {
  try {
    let dockerProcess;
    let running = await dockerPs();

    if (option.stop) {
      if (!running) {
        print('===== Epoch is not running! =====');
        return
      }

      print('===== Stopping epoch =====');

      dockerProcess = await spawn('docker-compose', ['down', '-v'], {});

      print('===== Epoch was successfully stopped! =====');
      return;
    }

    if (running) {
      print('\r\n===== Epoch already started and healthy! =====');
      return;
    }

    print('===== Starting epoch =====');
    dockerProcess = spawn('docker-compose', ['up', '-d']);

    dockerProcess.stderr.on('data', (data) => {
      print(data.toString())
    })

    while (!(await dockerPs())) {
      process.stdout.write(".");
      utils.sleep(1000);
    }

    print('\n\r===== Epoch was successfully started! =====');
    print('===== Funding default wallets! (~1 min) =====');

    await fundWallets();

    print('\r\n===== Default wallets was successfully funded! =====');
    return

  } catch (e) {
    printError(e.message)
  }
}

module.exports = {
  run
}