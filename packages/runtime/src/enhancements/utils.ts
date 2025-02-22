/* eslint-disable @typescript-eslint/no-var-requires */

import { lowerCaseFirst } from 'lower-case-first';
import path from 'path';
import * as util from 'util';
import { DbClientContract } from '../types';
import { ModelMeta } from './types';

/**
 * Gets field names in a data model entity, filtering out internal fields.
 */
export function getModelFields(data: object) {
    return data ? Object.keys(data) : [];
}

/**
 * Gets id fields for the given model.
 */
export function getIdFields(modelMeta: ModelMeta, model: string, throwIfNotFound = false) {
    let fields = modelMeta.fields[lowerCaseFirst(model)];
    if (!fields) {
        if (throwIfNotFound) {
            throw new Error(`Unable to load fields for ${model}`);
        } else {
            fields = {};
        }
    }
    const result = Object.values(fields).filter((f) => f.isId);
    if (result.length === 0 && throwIfNotFound) {
        throw new Error(`model ${model} does not have an id field`);
    }
    return result;
}

/**
 * Array or scalar
 */
export type Enumerable<T> = T | Array<T>;

/**
 * Uniformly enumerates an array or scalar.
 */
export function enumerate<T>(x: Enumerable<T>) {
    if (x === null || x === undefined) {
        return [];
    } else if (Array.isArray(x)) {
        return x;
    } else {
        return [x];
    }
}

/**
 * Zip two arrays or scalars.
 */
export function zip<T1, T2>(x: Enumerable<T1>, y: Enumerable<T2>): Array<[T1, T2]> {
    if (Array.isArray(x)) {
        if (!Array.isArray(y)) {
            throw new Error('x and y should be both array or both scalar');
        }
        if (x.length !== y.length) {
            throw new Error('x and y should have the same length');
        }
        return x.map((_, i) => [x[i], y[i]] as [T1, T2]);
    } else {
        if (Array.isArray(y)) {
            throw new Error('x and y should be both array or both scalar');
        }
        return [[x, y]];
    }
}

/**
 * Formats an object for pretty printing.
 */
export function formatObject(value: unknown) {
    return util.formatWithOptions({ depth: 20 }, value);
}

let _PrismaClientValidationError: new (...args: unknown[]) => Error;
let _PrismaClientKnownRequestError: new (...args: unknown[]) => Error;
let _PrismaClientUnknownRequestError: new (...args: unknown[]) => Error;

/* eslint-disable @typescript-eslint/no-explicit-any */
function loadPrismaModule(prisma: any) {
    // https://github.com/prisma/prisma/discussions/17832
    if (prisma._engineConfig?.datamodelPath) {
        // try engine path first
        const loadPath = path.dirname(prisma._engineConfig.datamodelPath);
        try {
            const _prisma = require(loadPath).Prisma;
            if (typeof _prisma !== 'undefined') {
                return _prisma;
            }
        } catch {
            // noop
        }
    }

    try {
        // Prisma v4
        return require('@prisma/client/runtime');
    } catch {
        try {
            // Prisma v5
            return require('@prisma/client');
        } catch (err) {
            if (process.env.ZENSTACK_TEST === '1') {
                // running in test, try cwd
                try {
                    return require(path.join(process.cwd(), 'node_modules/@prisma/client/runtime'));
                } catch {
                    return require(path.join(process.cwd(), 'node_modules/@prisma/client'));
                }
            } else {
                throw err;
            }
        }
    }
}

export function prismaClientValidationError(prisma: DbClientContract, message: string) {
    if (!_PrismaClientValidationError) {
        const _prisma = loadPrismaModule(prisma);
        _PrismaClientValidationError = _prisma.PrismaClientValidationError;
    }
    throw new _PrismaClientValidationError(message, { clientVersion: prisma._clientVersion });
}

export function prismaClientKnownRequestError(prisma: DbClientContract, ...args: unknown[]) {
    if (!_PrismaClientKnownRequestError) {
        const _prisma = loadPrismaModule(prisma);
        _PrismaClientKnownRequestError = _prisma.PrismaClientKnownRequestError;
    }
    return new _PrismaClientKnownRequestError(...args);
}

export function prismaClientUnknownRequestError(prisma: DbClientContract, ...args: unknown[]) {
    if (!_PrismaClientUnknownRequestError) {
        const _prisma = loadPrismaModule(prisma);
        _PrismaClientUnknownRequestError = _prisma.PrismaClientUnknownRequestError;
    }
    throw new _PrismaClientUnknownRequestError(...args);
}
