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
   * Dynamic type for creating a tuple of N size of error used to produce
   * a type of an Exception array which is never `undefined` when using
   * destructing.
   */
  export type ErrTuple<
    Count extends number = 100,
    T extends any[] = [typeof Exception]
  > = T['length'] extends Count ? T : ErrTuple<Count, [...T, typeof Exception]>

  /**
   *
   * @param scope
   * @returns
   */
  export function defs(options: { scope?: string; range?: number } = {}) {
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

        console.log({ p })

        const definition = class extends Exception {
          static get meta() {
            return new Proxy(this, {
              get(target, p, receiver) {
                console.log(target, p, receiver)
              },
            })
          }

          static override match<T>(
            e: unknown,
            callback?: (err: InstanceType<typeof definition>) => T
          ): T | void {
            if (e instanceof definition) return callback?.(e as any)
          }
          static override is(
            obj: unknown
          ): obj is InstanceType<typeof definition> {
            return obj instanceof definition
          }
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
    }) as unknown as ErrTuple &
      Record<string, typeof Exception> & { scoped: (typeof Exception)[] } & {
        [key: string]: typeof Exception
      }
  }
}

const {
  NormalError,
  0: MissingExample,
  1: InvalidParams,
  2: UserError,
  3: InvalidPerson,
  4: NextPerson,
} = e.defs({ range: 100 })

console.log(NormalError.meta)

function example1() {
  try {
    throw new MissingExample('An unknown exception occurred.')
  } catch (e) {
    if (e instanceof MissingExample) {
      console.log('instanceof works:', e.message)
    }
  }
}

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
    console.log({ meta: UserError.meta.thing })
    UserError.throw('asdasd')
  } catch (err) {
    UserError.match(err, (e) => e.debug())
  }
}

// console.log(e.registry)
// example1()
// example2()
// example3()
// example4()
