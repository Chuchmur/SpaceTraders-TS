import { Command, Argument } from "commander";
import chalk from "chalk";
import Api from "./Api.js";
import { log } from "./Automation.js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
const command = new Command("Hauler")
    .addArgument(new Argument("shipSymbol", "symbol of the ship that should mine"))
    .parse();
const shipSymbol = command.args[0];
command.name("Hauler - " + shipSymbol);
const startingWaypoint = (await Api.fleet.getShipNav(shipSymbol)).data.data
    .waypointSymbol;
const waitForFullCargo = async (shipSymbol, checkingInterval = 10000) => {
    return new Promise(async (resolve) => {
        const interval = setInterval(async () => {
            const cargo = (await Api.fleet.getMyShip(shipSymbol)).data.data.cargo;
            log("Checking cargo - " + cargo.units + " / " + cargo.capacity);
            if (cargo.capacity <= cargo.units) {
                clearInterval(interval);
                resolve();
            }
        }, checkingInterval);
        console.log("surveying");
        const cooldown = (await Api.fleet.getShipCooldown(shipSymbol)).data.data;
        if (cooldown) {
            log("Ship on cooldown, should wait for " + cooldown.remainingSeconds + "s");
            await new Promise((resolve) => setTimeout(() => resolve(null), cooldown.remainingSeconds * 1000));
        }
        const createSurveyRes = (await Api.fleet.createSurvey(shipSymbol)).data
            .data;
        const nav = (await Api.fleet.getShipNav(shipSymbol)).data.data;
        const market = (await Api.system.getMarket(nav.systemSymbol, nav.waypointSymbol)).data.data;
        var possibleValue = 0;
        if (market.tradeGoods) {
            for (const good of market.tradeGoods) {
                possibleValue +=
                    (createSurveyRes.surveys[0].deposits.filter((deposit) => deposit.symbol == good.symbol).length *
                        good.sellPrice) /
                        createSurveyRes.surveys[0].deposits.length;
            }
        }
        log("Survey " +
            createSurveyRes.surveys[0].signature +
            " possible value : " +
            possibleValue);
        const surveyDirPath = "./Surveys";
        const subdirName = nav.waypointSymbol;
        const subdirPath = surveyDirPath + "/" + subdirName;
        const filename = possibleValue + " - " + createSurveyRes.surveys[0].signature + ".json";
        const filePath = subdirPath + "/" + filename;
        const fileContent = JSON.stringify(createSurveyRes.surveys[0]);
        if (!existsSync(subdirPath)) {
            mkdirSync(subdirPath, { recursive: true });
        }
        writeFileSync(filePath, fileContent);
    });
};
const deliver = async (shipSymbol) => {
    const contractId = "cliqbuftk018hs60dbdipx8az";
    const contract = (await Api.contract.getContract(contractId)).data.data;
    if (contract.terms.deliver == undefined) {
        return;
    }
    try {
        var navRes = (await Api.fleet.navigateShip(shipSymbol, {
            waypointSymbol: contract.terms.deliver[0].destinationSymbol,
        })).data.data;
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, new Date(navRes.nav.route.arrival).getTime() - new Date().getTime());
        });
    }
    catch (error) {
        if (error.code == 4204) {
            log(error.message);
        }
        else {
            console.log(error);
        }
    }
    const dockRes = (await Api.fleet.dockShip(shipSymbol)).data.data;
    try {
        const refuelRes = (await Api.fleet.refuelShip(shipSymbol)).data.data;
        log("Refueled " +
            refuelRes.transaction.units +
            " for " +
            refuelRes.transaction.totalPrice);
    }
    catch (error) {
        log(error);
    }
    try {
        const shipCargo = (await Api.fleet.getMyShipCargo(shipSymbol)).data.data;
        var item;
        if (contract.terms.deliver) {
            const deliver = contract.terms.deliver;
            item = shipCargo.inventory.find((item) => item.symbol == deliver[0].tradeSymbol);
        }
        const deliverRes = (await Api.contract.deliverContract(contractId, {
            shipSymbol,
            tradeSymbol: contract.terms.deliver[0].tradeSymbol,
            units: item ? item.units : 0,
        })).data.data;
        log("Successfully delivered - " + deliverRes.contract.terms);
    }
    catch (error) {
        if (error.code == 4218) {
            log(error.message);
        }
        else {
            console.log(error);
        }
    }
};
const sellCargo = async (shipSymbol) => {
    const ship = (await Api.fleet.getMyShip(shipSymbol)).data.data;
    const market = (await Api.system.getMarket(ship.nav.systemSymbol, ship.nav.waypointSymbol)).data.data;
    await Api.fleet.dockShip(shipSymbol);
    for (const cargoItem of ship.cargo.inventory) {
        if (market.tradeGoods) {
            const n = market.tradeGoods.filter((tradeGood) => {
                return tradeGood.symbol == cargoItem.symbol;
            }).length == 1;
            log((n ? "Possible" : "Not possible") + " to sell " + " " + cargoItem.symbol);
            if (n) {
                const sellCargoRes = (await Api.fleet.sellCargo(shipSymbol, {
                    symbol: cargoItem.symbol,
                    units: cargoItem.units,
                })).data.data;
                log("Sold " +
                    sellCargoRes.transaction.units +
                    " " +
                    sellCargoRes.transaction.tradeSymbol +
                    " for " +
                    sellCargoRes.transaction.totalPrice +
                    " credits");
            }
        }
    }
    await Api.fleet.orbitShip(shipSymbol);
};
const jettisonCargo = async (shipSymbol, keepItemSymbol) => {
    const ship = (await Api.fleet.getMyShip(shipSymbol)).data.data;
    const filteredInventory = ship.cargo.inventory.filter((cargoItem) => {
        if (keepItemSymbol) {
            return keepItemSymbol.includes(cargoItem.symbol) == false;
        }
        else {
            return true;
        }
    });
    log("Going to jettison - " +
        filteredInventory.map((item) => {
            item.units + " " + item.symbol;
        }));
    for (const cargoItem of filteredInventory) {
        const jettisonRes = (await Api.fleet.jettison(shipSymbol, {
            symbol: cargoItem.symbol,
            units: cargoItem.units,
        })).data.data;
    }
};
const goBack = async (shipSymbol) => {
    try {
        var orbitRes = await Api.fleet.orbitShip(shipSymbol);
    }
    catch (error) {
        console.log(error);
    }
    try {
        var navRes = (await Api.fleet.navigateShip(shipSymbol, {
            waypointSymbol: startingWaypoint,
        })).data.data;
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, new Date(navRes.nav.route.arrival).getTime() - new Date().getTime());
        });
    }
    catch (error) {
        if (error.code == 4204) {
            log(error.message);
        }
        else {
            console.log(error);
        }
    }
};
while (true) {
    console.log(chalk.red("\r\n####### NEW CYCLE #######"));
    console.log(chalk.yellow("STEP - WAIT FOR FULL CARGO"));
    await waitForFullCargo(shipSymbol);
    console.log(chalk.yellow("STEP - DELIVER"));
    await deliver(shipSymbol);
    console.log(chalk.yellow("STEP - SELL"));
    await sellCargo(shipSymbol);
    console.log(chalk.yellow("STEP - GOING BACK TO STARTING WAYPOINT"));
    await goBack(shipSymbol);
    console.log(chalk.yellow("STEP - SELL"));
    await sellCargo(shipSymbol);
    console.log(chalk.yellow("STEP - JETTINSON CARGO"));
    await jettisonCargo(shipSymbol);
}
