console.clear()

export namespace e {
  class ErrorRegistry {
    public scoped: Map<string, Map<string, typeof Exception>>

    constructor() {
      this.scoped = new Map()
      this.scoped.set('global', new Map())
    }

    set(
      name: string,
      exception: typeof Exception,
      scopeName: string = 'global'
    ) {
      let scope = this.scoped.get(scopeName) ?? new Map()
      scope.set(name, exception)
      this.scoped.set(scopeName, scope)
    }

    get(options: {
      scope?: string | undefined
      name: string | number
    }): typeof Exception | undefined {
      const scope = options.scope ?? 'global'
      const maybe = this.scoped.get(scope)?.get(String(options.name))
      return maybe
    }

    scopes() {
      return Object.fromEntries(this.scoped.entries())
    }
  }

  /**
   * Global error definitions.
   */
  export const registry = new ErrorRegistry()

  const MAX_ERROR_DEFS = 100

  /**
   * Base exception class which all other errors inherit from.
   */
  export class Exception extends Error {
    static match<T>(
      e: unknown,
      callback?: (err: InstanceType<typeof Exception>) => T
    ): T | void {
      if (e instanceof Exception) return callback?.(e as any)
    }
    static is(obj: unknown): obj is InstanceType<typeof Exception> {
      return obj instanceof Exception
    }
    static throw(...args: any[]): never {
      throw new this(...args)
    }

    public scope?: string
    public code: number = 0
    constructor(...args: any[]) {
      super(args.join(' '))
    }

    public debug(): this {
      return this
    }
  }

  /**
   *
   * @param scope
   * @returns
   */
  export function num(options: { scope?: string; range?: number } = {}) {
    return new Proxy([], {
      get(target, p) {
        // Handle array length property
        if (p === 'length') return MAX_ERROR_DEFS

        if (p === 'scoped')
          return [
            ...(registry.scoped.get(options.scope ?? 'global')?.values() ?? []),
          ]

        // Handle symbols
        if (typeof p === 'symbol') return target[p as any]

        const range = options.range ?? 0
        const code = range + Number(p)

        const item = registry.get({ scope: options.scope, name: p })
        if (item) return item

        const definition = class extends Exception {
          /**
           * Executes the callback if the passed parameter is an instance of
           * the error definition.
           */
          static override match<T>(
            e: unknown,
            callback?: (err: InstanceType<typeof definition>) => T
          ): T | void {
            if (e instanceof definition) return callback?.(e as any)
          }
          /**
           * Type-guard which checks if item is an instanceof this error
           * class.
           */
          static override is(
            obj: unknown
          ): obj is InstanceType<typeof definition> {
            return obj instanceof definition
          }
          /**
           * Shorthand for creating and throwing new errors.
           */
          static override throw(...args: any[]): never {
            throw new this(...args)
          }
          override message!: string
          override code: number
          constructor(...args: any[]) {
            super(...args)
            this.message = args.join(' ')
            this.code = code
            if (options.scope) {
              this.scope = options.scope
            }
            console.log({ thrown: Object.getOwnPropertyDescriptors(this) })
          }

          public override debug(): this {
            const props = Object.getOwnPropertyDescriptors(this)

            console.log('===================')
            const items = Object.entries(props)
              .map(([key, data]) => {
                if (key === 'sourceURL') {
                  return ['file', `src${data.value?.split('src').pop()}`]
                }
              })
              .filter(
                (item): item is [key: string, value: any] => item !== undefined
              )

            items.push(['range', range])
            const meta = Object.fromEntries(items)

            const info = [
              ['name', this.name],
              ['message', this.message],
              ['code', code],
              ['metadata', meta],
            ]

            if (options.scope) {
              info.push(['scope', options.scope])
            }

            console.log(Object.fromEntries(info))

            return this
          }
        }

        registry.set(p.toString(), definition, options.scope)
        return definition
      },
    }) as unknown as {
      [key: string]: typeof Exception
      [idx: number]: typeof Exception
    }
  }
}

const {
  InvalidParams,
  InvalidRequest,
  NotAuthorized,
  NotFound,
  MissingExample,
  UserError,
} = e.num()

const {
  InvalidParams,
  InvalidRequest,
  NotAuthorized,
  NotFound,
  MissingExample,
  UserError,
} = e.num()

function example1() {
  try {
    throw new MissingExample('An unknown exception occurred.')
  } catch (e) {
    if (e instanceof MissingExample) {
      console.log('instanceof works:', e.message)
    }
  }
}

console.log(InvalidParams, InvalidRequest, NotAuthorized, NotFound)

function example2() {
  try {
    MissingExample.throw('An unknown exception occurred.')
  } catch (e) {
    if (e instanceof MissingExample) {
      console.log('instanceof works:', e.message)
    }
  }
}

function example3() {
  try {
    MissingExample.throw('An unknown exception occurred.')
  } catch (e) {
    InvalidParams.match(e, (err) => console.log('invliad PARAMS'))
    MissingExample.match(e, (err) => {
      console.log('Scoped handled error:', err.message, err.code)
    })
  }
}

function example4() {
  try {
    console.log({ meta: UserError })
    UserError.throw('asdasd')
  } catch (err) {
    UserError.match(err, (e) => e.debug())
  }
}

console.log(e.registry)
example1()
example2()
example3()
example4()
