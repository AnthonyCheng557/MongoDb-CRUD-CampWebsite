const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const httpSuccessStatus = 200;
process.stdin.setEncoding("utf8"); /* encoding */

const prompt = "Type stop to shutdown the server: ";

/*Mongo Stuff*/
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })

const uri = process.env.MONGO_CONNECTION_STRING;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};

const { MongoClient, ServerApiVersion } = require('mongodb');

if (process.argv.length != 3) {
    process.stdout.write("Usage supermakretServer.js portNumber");
    process.exit(1);
}
/*Set up server here*/
let portNumber = process.argv[2];
app.listen(portNumber);
console.log(`Web server is running at http://localhost:${portNumber}`);

process.stdout.write(prompt);
/*Look later */
process.stdout.write(prompt);
process.stdin.on("readable", () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        /*Awaiting Commands*/
        let command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server\n");
            process.exit(0);
        } else {
            process.stdout.write(`Invalid command: ${command}\n`);
        }
    }
    process.stdout.write(prompt);
    process.stdin.resume();
});

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.get("/", (request, response) => {
    response.render("index");
});

/*Application*/
app.get("/application", (request, response) => {
    response.render("application");
});

/*Application Post */
app.post("/application", async(request, response) => {
    let curr = new Date().toString();
    let name = request.body.name;
    let email = request.body.email;
    let gpa = request.body.gpa;
    let back_info = request.body.back_info;

    response.render("application_post", {
        name: name,
        email: email,
        gpa: gpa,
        back_info: back_info,
        time: curr,
    });
    /*Now insert on Mongo*/
    await insert(name, email, gpa, back_info, curr);
});

async function insert(name, email, gpa, back_info, time) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        /* Inserting one Applicant */
        console.log("***** Inserting Applicant *****");
        let person = {name: name, email: email, gpa: gpa, back_info: back_info, time: time};
        await insertApplicant(client, databaseAndCollection, person);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function insertApplicant(client, databaseAndCollection, new_Applicant) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(new_Applicant);
    console.log(`Applicant entry created with id ${result.insertedId}`);
}

app.get("/reviewApplication", (request, response) => {
    response.render("reviewApplication");
});

app.post("/reviewApplication", async(request, response) => {
    let email1 = request.body.email;
    /*Find From Mango*/
    let result = await find(email1);
    /*Here*/
    let {name, email, gpa, back_info, time} = result;
    response.render("application_post", {
        name: name,
        email: email,
        gpa: gpa,
        back_info: back_info,
        time: time,
    });
});

async function find(email) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
                console.log("***** Looking for Applicant *****");
                let applicant_email = email;
                let result = await findApplicant(client, databaseAndCollection, applicant_email);
                return result;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function findApplicant(client, databaseAndCollection, email) {
    let filter = {email: email};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
   if (result) {
    console.log(`Found Applicant with email ${email}`);
       return result;
   } else {
       console.log(`No Applicant found with email ${email}`);
   }
}

app.get("/adminGFA", (request, response) => {
    response.render("adminGFA");
});

app.post("/adminGFA", async(request, response) => {
    let num = request.body.gpa;
    /*Find From Mango sort multiple*/
    let result = await findGTE(num);
    let answer = `<table border="1"><tr><th>Name</th><th>GPA</th></tr>`;
    result.forEach(ele =>{
        let {name, gpa} = ele
        answer += `<tr><td>${name}</td><td>${gpa}</td></tr>`;
    });
    response.render("processAdminGFA", { orderTable: answer });
});

async function findGTE(gpa) {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
                console.log("***** Looking for Applicants with Greater Than Requested GPA *****");
                let result = await findMultiple(client, databaseAndCollection, gpa);
                return result;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function findMultiple(client, databaseAndCollection, gpa) {
    let filter = {gpa: { $gte: gpa}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection).find(filter);
    const result = await cursor.toArray();
    console.log("***** Found all GTE Applicants *****");
    return result;
}

app.get("/adminRemove", (request, response) => {
    response.render("adminRemove");
});

app.post("/adminRemove", async(request, response) => {
    let num = await remove();
    response.render("adminRemove2", { removeNum : num});

    
});

async function remove() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        console.log("***** Deleting All Applicants *****");
        return await deleteAll(client, databaseAndCollection);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function deleteAll(client, databaseAndCollection) {
    const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteMany({});
    console.log('Succesfully Deleted All Applicants')
    return result.deletedCount;
}





