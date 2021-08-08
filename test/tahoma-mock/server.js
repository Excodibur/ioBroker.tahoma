"use strict";

const fs = require("fs");
const express = require("express");
const server = express();

const port = 3000;

server.use(express.json());
server.use(express.urlencoded());

server.listen(port, () => {
    console.log("Tahomalink mock erver running on port " + port);
});

const mockData = JSON.parse(fs.readFileSync("test/tahoma-mock/data.json"));

mockData.forEach(api => {
    const path = api.endpoint.path;
    const method = api.endpoint.type;
    const response = api.response;

    console.log("Setup mock endpoint: [" + method + "] /" + path);
    switch (method) {
        case "GET":
            server.get("/" + path, (req, res) => {
                console.log("Received GET REQUEST: " + req.path + " Body: " + JSON.stringify(req.body));
                res.status(200).json(response);
            });
            break;
        case "POST":
            server.post("/" + path, (req, res) => {
                console.log("Received POST REQUEST: " + req.path + " Body: " + JSON.stringify(req.body));
                // Validate request, if needed
                try {
                    if ((api.request) && (api.request.expected)) {
                        for (const [field, value] of Object.entries(api.request.expected)) {
                            if ((req.body[field] === undefined) || (req.body[field] !== value)) {
                                const error = new Error(api.request.elseError.message);
                                error.name = api.request.elseError.code;
                                throw error;
                            }
                        }
                    }
                    res.status(200).json(response);
                } catch (error) {
                    res.status(error.name).send(error.message);
                }
            });
            break;
    }
});
