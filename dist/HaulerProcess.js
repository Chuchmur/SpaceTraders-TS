import net from "net";
import { createInterface } from "readline";
const port = 3000;
const client = net.createConnection({ port }, () => {
    client.write("Nouveau client ! - Hauler - ");
});
client.on("data", (data) => {
    console.log("Client received data : " + data.toString());
});
const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});
rl.question("Envoyer un message", (answer) => {
    client.write("Le hauler dit : " + answer);
});
