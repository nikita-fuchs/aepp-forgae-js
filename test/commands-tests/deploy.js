const path = require('path');
const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const execute = require('../../packages/forgae-utils/utils/forgae-utils.js').forgaeExecute;
const waitForContainer = require('../utils').waitForContainer;
const constants = require('../constants.json');
const fs = require('fs-extra');

let executeOptions = {
    cwd: process.cwd() + constants.deployTestsFolderPath
};

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const Deployer = require('./../../packages/forgae-lib/dist/forgae-deployer').Deployer;
const config = require('./../constants.json');

const INVALID_COMPILER_URL = 'http://compiler.somewhere.com';

const invalidParamDeploymentScriptPath = 'deployment/deploy2.js';
const missingParamDeploymentScriptPath = 'deployment/deploy3.js';
const additionalSCPath = 'contracts/ExampleContract2.aes';
const mainForgaeProjectDir = process.cwd();

function insertAdditionalFiles () {
    // copy needed files into test folder to run the specific tests
    let cwd = process.cwd();
    let testFolder = path.join(cwd, '/test/commands-tests/deployTest');

    const invalidParamDeploymentScript = './test/commands-tests/artifacts/deploy-template-invalid-init-param.jsss';
    const missingParamDeploymentScript = './test/commands-tests/artifacts/deploy-template-missing-init-param.jsss';
    const additionalSC = './test/commands-tests/multipleContractsFolder/ExampleContract5.aes';

    fs.copyFileSync(invalidParamDeploymentScript, `${ testFolder }/${ invalidParamDeploymentScriptPath }`);
    fs.copyFileSync(missingParamDeploymentScript, `${ testFolder }/${ missingParamDeploymentScriptPath }`);
    fs.copyFileSync(additionalSC, `${ testFolder }/${ additionalSCPath }`);
}

async function linkLocalPackages () {
    const forgaeLibDir = `${ process.cwd() }/packages/forgae-lib/`
    const forgaeUtilsDir = `${ process.cwd() }/packages/forgae-utils/`
    const forgaeConfigDir = `${ process.cwd() }/packages/forgae-config/`

    process.chdir(forgaeLibDir);
    await exec('npm link')

    process.chdir(forgaeUtilsDir);
    await exec('npm link')

    process.chdir(forgaeConfigDir);
    await exec('npm link')

    process.chdir(executeOptions.cwd);
    await exec('npm link forgae-lib')

    process.chdir(`${ executeOptions.cwd }/node_modules/forgae-lib`);
    await exec('npm link forgae-utils')

    process.chdir(forgaeUtilsDir)
    await exec('npm link forgae-config')

}

describe('ForgAE Deploy', () => {
    const secretKey = "bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"
    before(async () => {
        fs.ensureDirSync(`.${ constants.deployTestsFolderPath }`)

        await execute(constants.cliCommands.INIT, [], executeOptions)
        await execute(constants.cliCommands.NODE, [], executeOptions)
    })

    describe('Deployer', async () => {
        it('Should init Deployer with local network', async () => {
            // Arrange
            const expectedNetwork = "http://localhost:3001"
            const passedNetwork = "local"

            // Act
            const deployer = new Deployer(passedNetwork);

            // Assert
            assert.equal(deployer.network.url, expectedNetwork)
        })

        it('Should init Deployer with testnet network', async () => {
            // Arrange
            const expectedNetwork = "https://sdk-testnet.aepps.com"
            const passedNetwork = "testnet"

            // Act
            const deployer = new Deployer(passedNetwork);

            // Assert
            assert.equal(deployer.network.url, expectedNetwork)
        })

        it('Should init Deployer with mainnet network', async () => {
            // Arrange
            const expectedNetwork = "https://sdk-mainnet.aepps.com"
            const passedNetwork = "mainnet"

            // Act
            const deployer = new Deployer(passedNetwork);

            // Assert
            assert.equal(deployer.network.url, expectedNetwork)
        })

        it('Should init Deployer with custom network', async () => {
            // Arrange
            const network = "192.168.99.100:3001"
            const expectedNetworkId = "ae_custom"
            // Act
            const deployer = new Deployer(network, config.keypair, config.compilerUrl, expectedNetworkId);

            // Assert
            assert.equal(deployer.network.url, network)
            assert.equal(deployer.network.networkId, expectedNetworkId)
        })

        it('should revert if only custom network is passed', async () => {
            const expectedError = "Both network and networkId should be passed";
            let result;

            await linkLocalPackages();
            process.chdir(mainForgaeProjectDir)

            result = await execute(constants.cliCommands.DEPLOY, ["-n", "192.168.99.100:3001"], executeOptions);

            assert.include(result, expectedError)
        })

        it('should revert if only custom networkId is passed', async () => {
            const expectedError = "Both network and networkId should be passed";
            let result = await execute(constants.cliCommands.DEPLOY, ["--networkId", "testov"], executeOptions);

            assert.include(result, expectedError)
        })

        it('Should deploy contract with init arguments', async () => {
            // Arrange
            let expectedNetwork = "local"
            let expectedInitValue = "testString"
            let deployer = new Deployer(expectedNetwork);

            // Act
            let deployedContract = await deployer.deploy("./test/commands-tests/multipleContractsFolder/ExampleContract4.aes", [expectedInitValue]);

            const callNameResult = await deployedContract.call('name');

            // Assert
            const decodedNameResult = await callNameResult.decode("string");
            assert.equal(decodedNameResult, expectedInitValue)
        })
    })

    describe('Deploy command ', async () => {

        let expectedDeployResult = "ExampleContract.aes has been deployed";

        it('without any arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, [], executeOptions)
            assert.include(result, expectedDeployResult)
        })

        it('with network arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-n", "local"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with secret key arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-s", secretKey], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with path arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["--path", "./deployment/deploy.js"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with secret key and network arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-s", secretKey, "-n", "local"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with secret key and path arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-s", secretKey, "--path", "./deployment/deploy.js"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with network key and path arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-n", "local", "--path", "./deployment/deploy.js"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with all arguments', async () => {
            let result = await execute(constants.cliCommands.DEPLOY, ["-n", "local", "-s", secretKey, "--path", "./deployment/deploy.js"], executeOptions)

            assert.include(result, expectedDeployResult)
        })

        it('with network and secret on test network', async () => {
            let testSecretKey = constants.privateKeyTestnetDeploy;
            let result = '';

            try {
                result = await execute(constants.cliCommands.DEPLOY, ["-n", "testnet", "-s", testSecretKey], executeOptions);
            } catch (err) {
                console.log(err);
                console.log(err.stdout.toString('utf8'));
            }

            process.chdir(mainForgaeProjectDir);

            assert.include(result, expectedDeployResult)
        });

        it('with invalid network arguments', async () => {
            let executePromise = execute(constants.cliCommands.DEPLOY, ["-n", "public"], executeOptions)
            await assert.isFulfilled(executePromise, "Error: Unrecognised network public");
        })

        it('with invalid password arguments', async () => {
            let executePromise = execute(constants.cliCommands.DEPLOY, ["-s", "password"], executeOptions)

            await assert.isFulfilled(executePromise, "bad secret key size");
        })

        it('with invalid path arguments', async () => {
            let executePromise = execute(constants.cliCommands.DEPLOY, ["--path", "wrongPath"], executeOptions)

            await assert.isFulfilled(executePromise, "wrongPath");
        })

        it('Should NOT deploy with invalid additional parameter --compiler', async () => {

            let result = await execute(constants.cliCommands.DEPLOY, ["--compiler", INVALID_COMPILER_URL], executeOptions);

            assert.include(result, `Error: Compiler not defined`);
        })

        it('with secret key arguments that have 0 (AEs) balance', async () => {

            const zeroBalanceSecretKey = '922bf2635813fb51827dcdb8fff38d0c16c447594b60bc523f5e5c10a876d1b14701787d0fe30d8f50cf340262daee1204f3c881a9ce8c5c9adccfb0e1de40e5';
            let result = await execute(constants.cliCommands.DEPLOY, ["-s", zeroBalanceSecretKey], executeOptions);

            assert.include(result, 'Error: Giving up after 10 blocks mined');
        })

        it('try to deploy SC with invalid init parameters from another deployment script', async () => {
            insertAdditionalFiles();
            let result = await execute(constants.cliCommands.DEPLOY, ["--path", `./${ invalidParamDeploymentScriptPath }`], executeOptions);
            assert.include(result, 'Error: ValidationError');
        })

        it('try to deploy SC with missing init parameters from another deployment script', async () => {
            let error = `${ `Error data` }: ${ `{"reason":"Type errors\\nUnbound variable` }`;
            let result = await execute(constants.cliCommands.DEPLOY, ["--path", `./${ missingParamDeploymentScriptPath }`], executeOptions);
            assert.include(result, error);
        })
    })

    after(async () => {

        let running = await waitForContainer();
        if (running) {
            await execute(constants.cliCommands.NODE, [constants.cliCommandsOptions.STOP], executeOptions)
        }

        fs.removeSync(`.${ constants.deployTestsFolderPath }`)
    })
})