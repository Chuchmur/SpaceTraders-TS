import {
  AgentsApi,
  Configuration,
  ContractsApi,
  FleetApi,
  SystemsApi,
  DefaultApi,
} from "spacetraders-sdk";

import axios from "axios";

const configuration = new Configuration({
  accessToken:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVyIjoiR1JPU1BEIiwidmVyc2lvbiI6InYyIiwicmVzZXRfZGF0ZSI6IjIwMjMtMDYtMTAiLCJpYXQiOjE2ODY0MjE1NDQsInN1YiI6ImFnZW50LXRva2VuIn0.rZi1-M4co270z9F2j7UO9nrWCy_sVuDG3Kr5dloI4nQeZu0LxLmBRvIb8vZ3zpRAfWWSUvpB1pueIRJ1eD6BDTXN1hzuvPndpDhqQ8nJdQBnOEXbN2X_QzXAAdc1vA8YGUP-OKWVR-Lj9D0fGBx3iwRbIj4Kws-ioN50dc5oNWcCasBuEO4ubXkPdUk2JaRXcszFifonGKWR8Lp5zpT3QP7L-3J-BjJXMOVmEBia6hVYNAoPR5ZnIyT611352JUXhicxayOqHiHLdvS-H3zacEIFq-4yvB0w3lo0rWTYeUHGSBVzLA5cPUyJrpDpPzLGIVbUtJb8pltgxUpa0VQRWg",
});

export const instance = axios.create({});

// Retry logic for 429 rate-limit errors
instance.interceptors.response.use(
  // response interceptor
  (res) => res,
  // error interceptor
  async (error) => {
    if (error.response.status === 401) {
      console.log("Bad token");
    }

    const apiError = error.response?.data?.error;

    if (!apiError) {
      // No error data, wait for 10s and retry
      await new Promise((resolve) => {
        setTimeout(resolve, 10 * 1000);
      });

      return instance.request(error.config);
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];

      await new Promise((resolve) => {
        setTimeout(resolve, retryAfter * 1000);
      });

      return instance.request(error.config);
    }

    throw apiError;
  }
);

const Api = {
  system: new SystemsApi(configuration, undefined, instance),
  contract: new ContractsApi(configuration, undefined, instance),
  fleet: new FleetApi(configuration, undefined, instance),
  agent: new AgentsApi(configuration, undefined, instance),
  default: new DefaultApi(configuration, undefined, instance),
};

export default Api;
