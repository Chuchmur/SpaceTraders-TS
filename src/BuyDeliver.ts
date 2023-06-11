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
  .addArgument(
    new Argument("ContractId", "Identifier of the contract targeted")
  )
  .addArgument(
    new Argument("GoodSymbol", "Symbol of the good to buy & deliver")
  )
  .addArgument(new Argument("buyWaypoint", "Waypoint where to buy"))
  .parse();

const shipSymbol = command.args[0];
const contractId = command.args[1];
const goodSymbol = command.args[2];
const buyWaypoint = command.args[3];

command.name("Hauler - " + shipSymbol);

while (true) {
  /// Checking contract's progress
  log("Checking contract's progress");
  const contract = (await Api.contract.getContract(contractId)).data.data;
  const good = contract.terms.deliver?.find(
    (good) => good.tradeSymbol == goodSymbol
  );

  if (good == undefined) {
    throw "Good is undefined";
  }
  const remaining = good?.unitsRequired - good?.unitsFulfilled;
  if (remaining <= 0) {
    break;
  }

  /// Moving toward buying location
  log("Moving toward buying location");
  try {
    const navRes = (
      await Api.fleet.navigateShip(shipSymbol, { waypointSymbol: buyWaypoint })
    ).data.data;

    const navDuration =
      new Date(navRes.nav.route.arrival).getTime() -
      new Date(navRes.nav.route.departureTime).getTime();

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, navDuration);
    });
  } catch (error: any) {
    if (error.code == 4204) {
      log("Ship already at destination");
    }
  }

  /// Dock
  log("Dock");
  await Api.fleet.dockShip(shipSymbol);

  /// Buy
  log("Buy");
  const cargoRes = (await Api.fleet.getMyShipCargo(shipSymbol)).data.data;
  const buyUnits = Math.min(remaining, cargoRes.capacity - cargoRes.units);

  if (buyUnits != 0) {
    const buyRes = (
      await Api.fleet.purchaseCargo(shipSymbol, {
        symbol: goodSymbol,
        units: buyUnits,
      })
    ).data.data;

    const cargo = buyRes.cargo.inventory.find(
      (item) => item.symbol == goodSymbol
    );
    if (cargo == undefined) {
      break;
    }
  }

  // Orbit
  log("Orbit");
  await Api.fleet.orbitShip(shipSymbol);

  // Move to deliver destination
  log("Move to deliver destination");
  const navDeliverRes = (
    await Api.fleet.navigateShip(shipSymbol, {
      waypointSymbol: good.destinationSymbol,
    })
  ).data.data;

  const navDeliverDuration =
    new Date(navDeliverRes.nav.route.arrival).getTime() -
    new Date(navDeliverRes.nav.route.departureTime).getTime();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, navDeliverDuration);
  });

  // Dock
  log("Dock");
  await Api.fleet.dockShip(shipSymbol);

  // Deliver
  log("Deliver");
  const cargoUnits = (
    await Api.fleet.getMyShipCargo(shipSymbol)
  ).data.data.inventory.find((item) => item.symbol == goodSymbol)?.units;

  if (cargoUnits != undefined && cargoUnits != 0) {
    await Api.contract.deliverContract(contractId, {
      shipSymbol,
      tradeSymbol: goodSymbol,
      units: cargoUnits,
    });
  }

  // Refuel
  log("Refuel");
  await Api.fleet.refuelShip(shipSymbol);

  // Orbit
  log("Orbit");
  await Api.fleet.orbitShip(shipSymbol);
}
