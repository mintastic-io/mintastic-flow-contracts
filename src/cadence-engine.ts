export interface CadenceEngine {

    execute: <T>(callback: (CadenceEngine) => Promise<T>) => Promise<T>

    getCode: (name: string) => string

    getAuth: (address?: string, keyId?: number) => any

}