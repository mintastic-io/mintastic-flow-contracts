import fs from "fs";
import path from "path";

function getAllFiles(dirPath, stream) {
    fs.readdirSync(dirPath).forEach(function (file) {
        let filepath = path.join(dirPath, file);
        let stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            getAllFiles(filepath, stream);
        } else {
            const path = replaceAll("\\", "/", filepath.substr(8, filepath.length - 12));
            const code = replaceAll("\`", "'", fs.readFileSync(filepath, "utf8"));
            stream.write(`"${path}":\`${code}\`,`);
        }
    });
}

function replaceAll(find, replace, str) {
    while (str.indexOf(find) > -1) {
        str = str.replace(find, replace);
    }
    return str;
}

function listFiles(dirPath) {
    return fs.readdirSync(dirPath);
}

function readFile(filepath) {
    return fs.readFileSync(filepath, "utf8");
}

const stream = fs.createWriteStream('dist/src/contracts.js', {flags: 'a'});
stream.write('module.exports = {\n');

getAllFiles('./cadence', stream);
stream.write('}\n');
stream.end();

// create testnet compatible contracts
fs.mkdir('dist/cadence/contracts-local/', (error) => {
    if (error) console.log(error);
    else console.log("New Directory created successfully !!");
});

const files = listFiles("./cadence/contracts");
files.forEach(file => {
    const stream = fs.createWriteStream('dist/cadence/contracts-local/' + file, {flags: 'a'});

    let content = readFile("./cadence/contracts/" + file);
    content = content.replace("0xFungibleToken", '"./FungibleToken.cdc"');
    content = content.replace("0xMintasticMarket", '"./MintasticMarket.cdc"');
    content = content.replace("0xMintasticNFT", '"./MintasticNFT.cdc"');
    content = content.replace("0xNonFungibleToken", '"./NonFungibleToken.cdc"');

    stream.write(content);
    stream.end();
});