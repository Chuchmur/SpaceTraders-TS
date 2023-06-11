import { log } from "./Automation.js";
import Api from "./Api.js";
import { Command, Argument } from "commander";
import chalk from "chalk";
import { Survey } from "spacetraders-sdk";
import { existsSync, readFileSync, readdirSync, unlink, unlinkSync } from "fs";

const command = new Command("Miner")
  .addArgument(
    new Argument("shipSymbol", "symbol of the ship that should mine")
  )
  .parse();

const shipSymbol = command.args[0];
command.name("Hauler - " + shipSymbol);

const mine = async (shipSymbol: string) => {
  const ship = (await Api.fleet.getMyShip(shipSymbol)).data.data;

  if (ship.cargo.capacity == ship.cargo.units) {
    console.log(
      chalk.blue(new Date().toISOString()) +
        " " +
        shipSymbol +
        " - Can't mine with full cargo"
    );
    return;
  }

  const shipCooldown = (await Api.fleet.getShipCooldown(shipSymbol)).data.data;

  if (shipCooldown) {
    console.log(
      chalk.blue(new Date().toISOString()) +
        " " +
        "Ship on cooldown, should wait for " +
        shipCooldown.remainingSeconds +
        "s"
    );

    await new Promise((resolve) =>
      setTimeout(() => resolve(null), shipCooldown.remainingSeconds * 1000)
    );
  }

  log("Mining");

  const surveyPath = "./Surveys/" + ship.nav.waypointSymbol;
  var survey: Survey | undefined;

  const surveyMining = async () => {
    survey = undefined;
    if (existsSync(surveyPath)) {
      const readdirSyncRes = readdirSync(surveyPath);
      const sortedSurveys = readdirSyncRes.sort(
        (a, b) => +b.trim().split("-")[0] - +a.trim().split("-")[0]
      );

      if (sortedSurveys.length == 0) {
        try {
          const res = await Api.fleet.extractResources(shipSymbol, { survey });
          log("Not using any survey");
        } catch (error: any) {
          console.log(error);
          return false;
        }
      }

      for (const fileName of sortedSurveys) {
        const filePath = surveyPath + "/" + fileName;
        const data = readFileSync(filePath);
        survey = JSON.parse(data.toString()) as Survey;

        try {
          const res = await Api.fleet.extractResources(shipSymbol, { survey });
          log(
            "Using survey " +
              survey?.signature +
              " to mine " +
              res.data.data.extraction.yield.symbol +
              " x" +
              res.data.data.extraction.yield.units
          );
          break;
        } catch (error: any) {
          console.log(error);
          unlinkSync(filePath);

          return false;
        }
      }
    }
    return true;
  };

  var mineResult = false;
  while (mineResult == false) {
    mineResult = await surveyMining();
  }
};
const store = async (shipSymbol: string) => {
  const currentShip = (await Api.fleet.getMyShip(shipSymbol)).data.data;
  const localShips = (await Api.fleet.getMyShips()).data.data.filter((ship) => {
    const isMatch =
      ship.nav.waypointSymbol === currentShip.nav.waypointSymbol &&
      ship.symbol !== currentShip.symbol;

    return isMatch;
  });

  log(
    "local ships : " +
      localShips.map((ship) => {
        return ship.symbol;
      })
  );

  if (localShips.length > 0) {
    log("Found a ship to transfer cargo : " + localShips[0].symbol);

    for (const cargoItem of currentShip.cargo.inventory) {
      const maxTransferingUnits = Math.min(
        cargoItem.units,
        localShips[0].cargo.capacity - localShips[0].cargo.units
      );

      if (maxTransferingUnits > 0) {
        try {
          const transferCargoRes = (
            await Api.fleet.transferCargo(shipSymbol, {
              shipSymbol: localShips[0].symbol,
              tradeSymbol: cargoItem.symbol,
              units: Math.min(
                cargoItem.units,
                localShips[0].cargo.capacity - localShips[0].cargo.units
              ),
            })
          ).data.data;
          log("Transfered " + cargoItem.units + "x " + cargoItem.symbol);
        } catch (error: any) {
          if (error.code == 4217) {
            console.log(error.message);
          } else if (error.code == 4214) {
            console.log(error.message);
          }
          {
            return;
          }
        }
      } else {
        log("Can't transfer anymore item");
      }
    }
  }
};

process.on("message", (message) => {
  console.log(message);
});

while (true) {
  console.log(chalk.red("####### NEW CYCLE #######"));

  console.log(chalk.yellow("STEP - STORE"));
  await store(shipSymbol);

  console.log(chalk.yellow("STEP - MINE"));
  await mine(shipSymbol);

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 10000);
  });
}
