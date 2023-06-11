export declare const log: (message: string) => void;
export declare const mine: (shipSymbol: string) => Promise<void>;
export declare const deliverContract: (shipSymbol: string, contractId: string) => Promise<void>;
export declare const store: (shipSymbol: string) => Promise<void>;
