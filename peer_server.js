import express from "express";
import http from "http";
import { ExpressPeerServer } from "peer";

const app = express();
const server = http.createServer(app);

const peerServerOptions = {
  debug: true,
  path: "/", // this will match the frontend PeerJS path
  allow_discovery: true, // optional
};

const peerServer = ExpressPeerServer(server, peerServerOptions);
app.use("/peerjs", peerServer);

server.listen(9000, "0.0.0.0", () => {
  console.log("PeerJS server running on http://localhost:9000/peerjs");
});
