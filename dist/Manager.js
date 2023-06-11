import { fork } from "child_process";
import readline from "readline";
// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const children = [];
// Define your programs/commands and their corresponding actions
const programs = {
    greet: () => {
        console.log("Hello!");
    },
    time: () => {
        console.log(new Date().toLocaleTimeString());
    },
    exit: () => {
        rl.close();
    },
    sm: (shipSymbol) => {
        const child = fork("dist\\Miner.js", [shipSymbol], {
            stdio: ["pipe", "pipe", "pipe", "ipc"],
        });
        child.stdout?.on("data", (data) => {
            console.log(shipSymbol + " - " + data.toString());
        });
        child.send("Le message");
    },
};
// Display a prompt and listen for user input
rl.prompt();
// Handle user input
rl.on("line", (input) => {
    const [command, ...args] = input.trim().split(" ");
    if (command in programs) {
        programs[command](...args);
    }
    else {
        console.log("Command not found. Please try again.");
    }
    rl.prompt();
});
// Clean up when the readline interface is closed
rl.on("close", () => {
    console.log("Exiting...");
    process.exit(0);
});
