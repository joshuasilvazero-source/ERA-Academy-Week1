const express = require('express');
const { MongoClient} = require('mongodb');
const app = express();

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db('school_demo');
        const studentsCollection = db.collection('students');
        await studentsCollection.insertOne({ firstName: "John", lastName: "Doe", gradeLevel: 10 });
        app.get('/', (req, res) => {
            res.send('Backend connected to Mongodb');
        });
        app.listen(3000, () => {
            console.log("Server is running at http://localhost:3000");
        });
    }  catch (error) {
        console.error("Error connecting to Mongodb:", error);
    }
    
}
startServer();