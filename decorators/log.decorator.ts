import 'reflect-metadata'

import { BaseController } from '../helpers/base-controller.class'

import { getLogger } from '../../helpers/logger.helper'

import {AnyFunction, EndpointParamMeta, LogParamDecorator} from '../helpers/aq-base.types'

import { loggerMetadataKeySymbol, paramMetaSymbol } from './symbols'
import {getVariableName} from "./base-param-decorators.class";

/**
 * Decorator function for methods that logs at the start and at the end of the function invocation
 * also injects the logger in a parameter (via the @Logger decorator)
 */
export function Log() {
  return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
    const oldFunc = descriptor.value as AnyFunction

    // eslint-disable-next-line no-param-reassign
    descriptor.value = (...args: unknown[]) => {
      const funcDef = `${target?.name}.${oldFunc?.name}`
      const loggerParamIndex = Reflect.getOwnMetadata(loggerMetadataKeySymbol, target, methodName) as number

      const logger = getLogger(funcDef)
      // eslint-disable-next-line no-param-reassign
      args[loggerParamIndex] = logger

      logger.info(`${funcDef} invoked`)
      const result = oldFunc(...args)

      return Promise.resolve(result).then((value: unknown) => {
        logger.info(`${funcDef} finished`)
        return value
      })
    }
  }
}

/**
 * Parameter Decorator function
 * Saves in the method metadata on symbol "aq:decorators:logger" the position of the variable to inject the logger
 */
export function Logger(): LogParamDecorator {
  return function (target: typeof Object, methodName: string | symbol, parameterIndex: number) {
    // If the logger decorator is used in controller
    if (Object.getPrototypeOf(target.constructor) === BaseController) {
      const variableName = getVariableName(String(methodName), target[methodName], parameterIndex)

      const paramMeta: EndpointParamMeta[] =
        Reflect.getMetadata(paramMetaSymbol, target, methodName) || new Array(target[methodName].length)
      paramMeta[parameterIndex] = {
        ...paramMeta[parameterIndex],
        decorator: 'LOGGER',
        type: null,
        index: parameterIndex,
        name: variableName,
        path: null,
        cast: false,
      }
      Reflect.defineMetadata(paramMetaSymbol, paramMeta, target, methodName)
    } else {
      Reflect.defineMetadata(loggerMetadataKeySymbol, parameterIndex, target, methodName)
    }
  }
}
