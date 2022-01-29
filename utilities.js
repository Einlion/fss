const crypto = require("crypto-js")
const fs = require('fs');

let c = fs.readFileSync("./config.json");
let config = JSON.parse(c);
// const sharp = require("sharp")

function wordToByteArray(wordArray) {
    var byteArray = [], word, i, j;
    for (i = 0; i < wordArray.length; ++i) {
        word = wordArray[i];
        for (j = 3; j >= 0; --j) {
            byteArray.push((word >> 8 * j) & 0xFF);
        }
    }
    return byteArray;
}


// async function optimize(array_buffer) {
//     let size = array_buffer.byteLength;
//     let fact = 100;
//     while(size > MAX_SIZE) {
//         const data = await sharp(Buffer.from(array_buffer))
//         .jpeg({
//             quality: fact,
//             chromaSubsampling: '4:4:4'
//         })
//         .toBuffer();
//         size = data.size();
//         fact = fact - 10;
//     }
//     return data.buffer;
// }

function encrypt(array_buffer) {
    // array_buffer = await optimize(array_buffer);
    const key = "xyz123";
    const wordArray = crypto.lib.WordArray.create(array_buffer);
    ct = crypto.AES.encrypt(wordArray, config["secret_key"])
    return ct.toString();
}

function decrypt(str) {
    let dec = crypto.AES.decrypt(str, config["secret_key"]);
    let ba = wordToByteArray(dec.words);
    return ba;
}

module.exports = { encrypt, decrypt }