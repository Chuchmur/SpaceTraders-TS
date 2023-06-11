import { AgentsApi, ContractsApi, FleetApi, SystemsApi, DefaultApi } from "spacetraders-sdk";
export declare const instance: import("axios").AxiosInstance;
declare const Api: {
    system: SystemsApi;
    contract: ContractsApi;
    fleet: FleetApi;
    agent: AgentsApi;
    default: DefaultApi;
};
export default Api;
