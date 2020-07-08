export interface Config {
    port: number;
    database: IDatabase;
}

export interface IDatabase {
    protocol: string;
    host: string;
    user: string;
    password: string;
    name: string;
    opts: string;
}

const serverConfig: Config = {
    port: Number(process.env.PORT) || 3000,
    database: {
        protocol: process.env.DB_PROTOCOL || "",
        host: process.env.DB_HOST || "",
        user: process.env.DB_USER || "",
        password: process.env.DB_PASSWORD || "",
        name: process.env.DB_NAME || "",
        opts: process.env.DB_OPTS || ""
    }
}

function getDbUri(): string {
    let str = "";
    str += serverConfig.database.protocol ? serverConfig.database.protocol + "://" : "";
    str += (serverConfig.database.user && serverConfig.database.password) ? serverConfig.database.user + ":" + serverConfig.database.password + "@" : "";
    str += `${serverConfig.database.host}/${serverConfig.database.name}`;
    str += serverConfig.database.opts ? "?" + serverConfig.database.opts : "";

    return str;
}

export {serverConfig, getDbUri}
