import { readFileSync, readdirSync, renameSync } from "fs";
import { Survey, SurveySizeEnum } from "spacetraders-sdk";

const files = readdirSync("./");

for (const fileName of files) {
  const survey = JSON.parse(readFileSync(fileName).toString()) as Survey;

  var multiplier = 1;
  if (survey.size == SurveySizeEnum.Moderate) {
    multiplier = 2;
  } else if (survey.size == SurveySizeEnum.Large) {
    multiplier = 3;
  }

  const oldPossibleValue = +fileName.trim().split("-")[0] / multiplier;
  var newFileName = fileName.split("-");
  newFileName[0] = oldPossibleValue.toString();

  renameSync(fileName, newFileName.join("-"));
}
