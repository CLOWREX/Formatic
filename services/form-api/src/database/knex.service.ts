import { Injectable } from "@nestjs/common";
import knex from 'knex'
import * as config from '../../knexfile'

@Injectable()
export class KnexService {
    private db
    private userDb

    constructor(){
        this.db = knex(config.production)
        this.userDb = knex({
            ...config.production,
            connection: {
                ...config.production.connection,
                database: process.env.DB_NAME_USER
            }
        })
    }

    get connection(){
        return this.db
    }

    get userConnection(){
        return this.userDb
    }
}