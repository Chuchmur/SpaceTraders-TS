import { readFileSync, readdirSync, unlinkSync } from "fs";
const surveyDirPath = "./Surveys";
for (const subdirName of readdirSync(surveyDirPath)) {
    for (const fileName of readdirSync(surveyDirPath + "/" + subdirName)) {
        const filePath = surveyDirPath + "/" + subdirName + "/" + fileName;
        const survey = JSON.parse(readFileSync(filePath).toString());
        if (new Date(survey.expiration) < new Date()) {
            unlinkSync(filePath);
        }
    }
}
