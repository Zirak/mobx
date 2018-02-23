export const EMPTY_ARRAY = []
Object.freeze(EMPTY_ARRAY)

export const EMPTY_OBJECT = {}
Object.freeze(EMPTY_OBJECT)

declare var global
export function getGlobal() {
    return typeof window !== "undefined" ? window : global
}

export interface Lambda {
    (): void
    name?: string
}

export function getNextId() {
    return ++globalState.mobxGuid
}

export function fail(message: string, thing?): never {
    invariant(false, message, thing)
    throw "X" // unreachable
}

export function invariant(check: boolean, message: string, thing?) {
    if (!check) throw new Error("[mobx] " + message + (thing ? ` in '${thing}'` : ""))
}

/**
 * Prints a deprecation message, but only one time.
 * Returns false if the deprecated message was already printed before
 */
const deprecatedMessages: string[] = []

export function deprecated(msg: string): boolean {
    if (deprecatedMessages.indexOf(msg) !== -1) return false
    deprecatedMessages.push(msg)
    console.error("[mobx] Deprecated: " + msg)
    return true
}

/**
 * Makes sure that the provided function is invoked at most once.
 */
export function once(func: Lambda): Lambda {
    let invoked = false
    return function() {
        if (invoked) return
        invoked = true
        return (func as any).apply(this, arguments)
    }
}

export const noop = () => {}

export function unique<T>(list: T[]): T[] {
    const res: T[] = []
    list.forEach(item => {
        if (res.indexOf(item) === -1) res.push(item)
    })
    return res
}

export function isObject(value: any): boolean {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value) {
    if (value === null || typeof value !== "object") return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
}

export function canBeMadeObservable(value) {
    return isObject(value) || Array.isArray(value) || isES6Map(value)
}

export function objectAssign<T extends object>(
    target: { [key: string]: never },
    clonedSource: T,
    ...sources: (Partial<T> & object)[]
): T
export function objectAssign<T extends object>(target: T, ...sources: (Partial<T> & object)[]): T
export function objectAssign() {
    const res = arguments[0]
    for (let i = 1, l = arguments.length; i < l; i++) {
        const source = arguments[i]
        for (let key in source)
            if (hasOwnProperty(source, key)) {
                res[key] = source[key]
            }
    }
    return res
}

const prototypeHasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwnProperty(object: Object, propName: string) {
    return prototypeHasOwnProperty.call(object, propName)
}

export function makeNonEnumerable(object: any, propNames: string[]) {
    for (let i = 0; i < propNames.length; i++) {
        addHiddenProp(object, propNames[i], object[propNames[i]])
    }
}

export function addHiddenProp(object: any, propName: string, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value
    })
}

export function addHiddenFinalProp(object: any, propName: string, value: any) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value
    })
}

export function isPropertyConfigurable(object: any, prop: string): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(object, prop)
    return !descriptor || (descriptor.configurable !== false && descriptor.writable !== false)
}

export function assertPropertyConfigurable(object: any, prop: string) {
    invariant(
        isPropertyConfigurable(object, prop),
        `Cannot make property '${prop}' observable, it is not configurable and writable in the target object`
    )
}

export function getEnumerableKeys(obj) {
    const res: string[] = []
    for (let key in obj) res.push(key)
    return res
}

/**
 * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
 * If you have such a case, you probably should use this function but something fancier :).
 */
export function deepEqual(a, b) {
    if (a === null && b === null) return true
    if (a === undefined && b === undefined) return true
    if (areBothNaN(a, b)) return true
    if (typeof a !== "object") return a === b
    const aIsArray = isArrayLike(a)
    const aIsMap = isMapLike(a)
    if (aIsArray !== isArrayLike(b)) {
        return false
    } else if (aIsMap !== isMapLike(b)) {
        return false
    } else if (aIsArray) {
        if (a.length !== b.length) return false
        for (let i = a.length - 1; i >= 0; i--) if (!deepEqual(a[i], b[i])) return false
        return true
    } else if (aIsMap) {
        if (a.size !== b.size) return false
        let equals = true
        a.forEach((value, key) => {
            equals = equals && deepEqual(b.get(key), value)
        })
        return equals
    } else if (typeof a === "object" && typeof b === "object") {
        if (a === null || b === null) return false
        if (isMapLike(a) && isMapLike(b)) {
            if (a.size !== b.size) return false
            // Freaking inefficient.... Create PR if you run into this :) Much appreciated!
            return deepEqual(observable.shallowMap(a).entries(), observable.shallowMap(b).entries())
        }
        if (getEnumerableKeys(a).length !== getEnumerableKeys(b).length) return false
        for (let prop in a) {
            if (!(prop in b)) return false
            if (!deepEqual(a[prop], b[prop])) return false
        }
        return true
    }
    return false
}

export function createInstanceofPredicate<T>(
    name: string,
    clazz: new (...args: any[]) => T
): (x: any) => x is T {
    const propName = "isMobX" + name
    clazz.prototype[propName] = true
    return function(x) {
        return isObject(x) && x[propName] === true
    } as any
}

export function areBothNaN(a: any, b: any): boolean {
    return typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b)
}

/**
 * Returns whether the argument is an array, disregarding observability.
 */
export function isArrayLike(x: any): x is Array<any> | IObservableArray<any> {
    return Array.isArray(x) || isObservableArray(x)
}

export function isMapLike(x: any): boolean {
    return isES6Map(x) || isObservableMap(x)
}

export function isES6Map(thing): boolean {
    if (getGlobal().Map !== undefined && thing instanceof getGlobal().Map) return true
    return false
}

export function getMapLikeKeys<V>(map: ObservableMap<V> | IKeyValueMap<V> | any): string[] {
    let keys
    if (isPlainObject(map)) keys = Object.keys(map)
    else if (Array.isArray(map)) keys = map.map(([key]) => key)
    else if (isMapLike(map)) keys = (Array as any).from(map.keys())
    else fail(`Cannot get keys from '${map}'`)
    return keys
}

declare var Symbol

export function primitiveSymbol() {
    return (typeof Symbol === "function" && Symbol.toPrimitive) || "@@toPrimitive"
}

export function toPrimitive(value) {
    return value === null ? null : typeof value === "object" ? "" + value : value
}

import { globalState } from "../core/globalstate"
import { IObservableArray, isObservableArray } from "../types/observablearray"
import { isObservableMap, ObservableMap, IKeyValueMap } from "../types/observablemap"
import { observable } from "../api/observable"
