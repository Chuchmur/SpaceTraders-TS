import net from "net";

const port = 3000;

const client = net.connect({ port }, () => {
  client.write("Nouveau client ! - Miner ");
});

client.on("data", (data) => {
  console.log("Client received data : " + data.toString());
});

client.write("Client sent data");
