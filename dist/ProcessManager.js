import net from "net";
const port = 3000;
const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        console.log("Server received message: ", data.toString());
        socket.write(data.toString());
    });
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
    socket.on("connect", () => {
        console.log("Connection");
    });
});
server.listen(3000, () => {
    console.log("Server listening on port 3000");
});
