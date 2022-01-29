const fastify = require('fastify')({ logger: 'true' })
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data')
const fs = require('fs');
const zip = require("jszip")
const {encrypt, decrypt} = require("./utilities.js")

let c = fs.readFileSync("./config.json");
let config = JSON.parse(c);

fastify.register(require('fastify-multipart'), {
    limits: {
      fieldNameSize: 100,    // Max field name size in bytes
      fieldSize: 100,        // Max field value size in bytes
      fields: 10,            // Max number of non-file fields
      fileSize: 1000000000,  // For multipart forms, the max file size in bytes
      files: 1,              // Max number of file fields
      headerPairs: 2000      // Max number of header key=>value pairs
    }
  });

async function send(webhook_url, array_buffer, filename) {
    const data = encrypt(array_buffer);
    let form = new FormData();
    form.append('files[0]', Buffer.from(data), {
        'filename': filename,
        'contentType': "text/plain"
    });
    let resp = await fetch(webhook_url, {
        'method': 'POST',
        'body': form.getBuffer(),
        'headers': form.getHeaders(),
    });
    return (await resp.json())["attachments"][0]["url"];
}

fastify.get("/get", async (req, res) => {
    console.log(req.ip)
    try {
        url = req.query.url;
    } catch {
        return "No URL specified."
    }
    let resp = await fetch(url);
    let str = await resp.text()
    let array_buffer = decrypt(str);
    res.headers({"Content-Disposition": "inline; filename=image.jpg"}).type("image/jpeg").send(Buffer.from(array_buffer));
})

// fastify.get("/addpls", async (req, res) => {
//     try {
//         url = req.query.url;
//     } catch {
//         return "No URL param."
//     }
//     let o = fs.readFileSync("./data.json");
//     let obj = JSON.parse(o);
//     if (obj[url] != null) {
//         return obj[url]
//     }
//     let a = [];
//     let r = await fetch(url)
//     let x = await zip.loadAsync(r.arrayBuffer())

//     for (let property in x.files) {
//         file = x.files[property]
//         console.log(file.name);
//         let s = await file.async("arraybuffer");
//         a.push(await send(webhook_url, s, file.name));
//     }

//     obj[url] = a;
//     fs.writeFileSync("./data.json", JSON.stringify(obj));
//     return obj[url];
// })

fastify.post("/add", async (req, res) => {
    const checktype = await import("file-type")
    let webhook_url = config["webhook_url"]
    let data = await req.file()
    let buffer = await data.toBuffer()
    let filetype = await checktype.fileTypeFromBuffer(buffer);
    let hostname = config["hostname"]
    if(filetype.ext != "zip") {
        return "Only zip Files are allowed.";
    }
    let a = [];
    let x = await zip.loadAsync(buffer.buffer)

    for (let property in x.files) {
        file = x.files[property]
        let s = await file.async("arraybuffer");
        let filetype = await checktype.fileTypeFromBuffer(s);
        if(!filetype.mime.includes("image")) {
            return "Only Images are supported."
        }

        let resolver = "https://" + hostname + "/get?url=" + await send(webhook_url, s, file.name); 
        a.push(resolver);
    }

    return JSON.stringify(a);
})

const start = async () => {
    try {
        await fastify.listen(4000, "0.0.0.0")
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()