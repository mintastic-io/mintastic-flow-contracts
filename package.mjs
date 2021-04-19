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

const stream = fs.createWriteStream('dist/src/contracts.js', {flags: 'a'});
stream.write('module.exports = {\n');

getAllFiles('./cadence', stream);
stream.write('}\n');
stream.end();