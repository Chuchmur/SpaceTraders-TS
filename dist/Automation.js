import api from "./Api.js";
import chalk from "chalk";
import { existsSync, readFileSync, readdirSync, } from "fs";
export const log = (message) => {
    console.log(chalk.blue(new Date().toISOString()) + " " + message);
};
export const mine = async (shipSymbol) => {
    const ship = (await api.fleet.getMyShip(shipSymbol)).data.data;
    if (ship.cargo.capacity == ship.cargo.units) {
        console.log(chalk.blue(new Date().toISOString()) +
            " " +
            shipSymbol +
            " - Can't mine with full cargo");
        return;
    }
    const shipCooldown = (await api.fleet.getShipCooldown(shipSymbol)).data.data;
    if (shipCooldown) {
        console.log(chalk.blue(new Date().toISOString()) +
            " " +
            "Ship on cooldown, should wait for " +
            shipCooldown.remainingSeconds +
            "s");
        await new Promise((resolve) => setTimeout(() => resolve(null), shipCooldown.remainingSeconds * 1000));
    }
    log("Mining");
    const surveyPath = "./Surveys/" + ship.nav.waypointSymbol;
    var survey;
    survey = undefined;
    if (existsSync(surveyPath)) {
        const readdirSyncRes = readdirSync(surveyPath);
        if (readdirSyncRes.length > 0) {
            const filePath = surveyPath +
                "/" +
                readdirSyncRes.sort((a, b) => +b.trim().split("-")[0] - +a.trim().split("-")[0])[0];
            const data = readFileSync(filePath);
            survey = JSON.parse(data.toString());
        }
    }
    const res = await api.fleet.extractResources(shipSymbol, { survey });
    log("Using survey " +
        survey?.signature +
        " to mine " +
        res.data.data.extraction.yield.symbol +
        " x" +
        res.data.data.extraction.yield.units);
};
export const deliverContract = async (shipSymbol, contractId) => {
    const contract = (await api.contract.getContract(contractId)).data.data;
    const waypointSymbol = (await api.fleet.getShipNav(shipSymbol)).data.data
        .waypointSymbol;
    if (contract.terms.deliver) {
        for (const good of contract.terms.deliver) {
            if (good.destinationSymbol == waypointSymbol) {
                const res = await api.contract.deliverContract(contractId, {
                    shipSymbol,
                    tradeSymbol: good.tradeSymbol,
                    units: good.unitsRequired,
                });
            }
        }
    }
};
export const store = async (shipSymbol) => {
    const currentShip = (await api.fleet.getMyShip(shipSymbol)).data.data;
    const localShips = (await api.fleet.getMyShips()).data.data.filter((ship) => {
        const isMatch = ship.nav.waypointSymbol === currentShip.nav.waypointSymbol &&
            ship.symbol !== currentShip.symbol;
        return isMatch;
    });
    log("local ships : " +
        localShips.map((ship) => {
            return ship.symbol;
        }));
    if (localShips.length > 0) {
        log("Found a ship to transfer cargo : " + localShips[0].symbol);
        for (const cargoItem of currentShip.cargo.inventory) {
            await api.fleet.transferCargo(shipSymbol, {
                shipSymbol: localShips[0].symbol,
                tradeSymbol: cargoItem.symbol,
                units: cargoItem.units,
            });
            log("Transfered " + cargoItem.units + "x " + cargoItem.symbol);
        }
    }
};
