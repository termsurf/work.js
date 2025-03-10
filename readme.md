<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align='center'>
  <img src='https://github.com/cluesurf/call.js/blob/make/view/base.gif?raw=true' height='192'>
</p>

<h3 align='center'>@cluesurf/call</h3>
<p align='center'>
  GraphQL-like query resolver for TypeScript
</p>

<br/>
<br/>
<br/>

## Installation

```
pnpm add @cluesurf/call
yarn add @cluesurf/call
npm i @cluesurf/call
```

## Keywords

| `term` | meaning                                              |
| :----- | :--------------------------------------------------- |
| `take` | Input to the query/action.                           |
| `load` | The data projected into the response.                |
| `like` | The type of an object, specified as matching.        |
| `form` | The type of an object, specified on the type itself. |
| `link` | A property on a type.                                |
| `size` | The count of the records in a collection property.   |

## Example

### The `rule` definitions

First you have to define the "rules", which are the rules defining what
is allowed in a call. First we define the "load rules", the properties
which you are allowed to query. This is a static definition used to
generate type definitions.

```ts
// ~/calls/source/rule/load/chat.ts
export const load_chat_base: RuleLoad = {
  like: 'chat',
  load: {
    code: {
      load: {
        base: true,
        seed: true,
        hook: true,
      },
    },
    flow: {
      load: {
        code: {
          load: {
            base: true,
            seed: true,
            hook: true,
          },
        },
      },
    },
  },
}
```

Then we aggregate all the load haves into one object with names as the
keys.

```ts
// ~/calls/source/rule/load/index.ts
export * as chat from './chat'
```

Then given we have all the load rules defined, we can create a type for
the list of have load names.

```ts
// ~/calls/type/rule/load.ts
import * as load from '~/calls/source/rule/load'

export type RuleLoadName = keyof typeof load
```

Given those have load names, we can create a type used by the "have
tasks", or the task creation rules.

```ts
// ~/calls/type/rule/task.ts
import { RuleLoadName } from '~/calls/type/rule/load'
import { RuleTask } from '@cluesurf/call'

export type RuleTaskForm = RuleTask<RuleLoadName>
```

So now we have a `RuleTaskForm` type, and this is used to type our
definition of have tasks, so we can get autocompletion for the load
names. These are also static definitions, so don't have any dynamic
parameters, because they are used to create compile-time type
definitions.

```ts
// ~/calls/source/rule/task/chat.ts
export const read_chat_by_code_hook: RuleTaskForm = {
  take: {
    code: {
      link: {
        hook: { like: 'string' },
      },
    },
  },
  load: 'load_chat_base',
}
```

Given a bunch of rule task definitions, for the definition of possible
tasks, we aggregate them as well.

```ts
// ~/calls/source/rule/task/index.ts
export * as chat from './chat'
```

Now we are done with the "rule" types, the specs on what types of calls
can be created.

### The `call` definitions

We move on to creating "call" types, starting with the load call types.
These define our specific query structure, given the limitations of the
corresponding have load type.

```ts
// ~/calls/source/call/load/chat.ts
export const load_chat_base = {
  like: 'chat',
  load: {
    code: {
      load: {
        base: true,
        hook: true,
        seed: true,
      },
    },
    flow: {
      load: {
        code: {
          load: {
            base: true,
            hook: true,
            seed: true,
          },
        },
      },
    },
  },
}
```

Then like usual, we aggregate all our call load type definitions.

```ts
// ~/calls/source/call/load/index.ts
export * as chat from './chat'
```

And we can collect the names for all the call load types.

```ts
// ~/calls/type/call/load.ts
import * as load from '~/calls/source/call/load'

export type CallLoadName = keyof typeof load
```

Given the load names, we can create a `HookForm` type which will be used
to get autocomplete on (a) the rule task names, and (b) the call load
names.

```ts
// ~/calls/type/call/task.ts
import * as task from '~/calls/source/rule/task'
import { CallLoadName } from '~/calls/type/call/load'

export type RuleTaskName = keyof typeof task

export type HookForm = Hook<RuleTaskName, CallLoadName>
```

Given the `HookForm`, we can create specific task structures which we
will use to make API calls at runtime. This takes a reference to a have
task name, and a call load name.

```ts
// ~/calls/source/call/chat.ts
import { HookForm } from '~/calls/type/call/task'

export const read_chat_by_code_hook: HookForm = {
  // this `task` is referencing a task
  // defined in the @cluesurf/seed project.
  task: 'read_chat_by_code_hook',
  // this `load` is referencing a type
  // we just defined for our load forms.
  load: 'load_chat_base',
}
```

Then we aggregate them like usual.

```ts
// ~/calls/source/call/task/index.ts
export * as chat from './chat'
```

```ts
// ~/calls/source/rule/index.ts
import * as task from './task'
import * as load from './load'

export default { task, load }
```

```ts
// ~/calls/source/call/index.ts
import * as task from './task'
import * as load from './load'

export default { task, load }
```

Now we build our script to generate the call files and their types. The
`./form` are the schema definitions.

```ts
// ./scripts/work/make.ts
import makeWork from '@cluesurf/call/make'
import baseForm from '~/calls/source/form'
import baseRule from '~/calls/source/rule'
import baseCall from '~/calls/source/call'
import fs from 'fs'

async function make() {
  const { load, task, form } = await makeWork({
    form: baseForm,
    have: baseRule,
    call: baseCall,
  })
  fs.writeFileSync('~/calls/load.ts', load)
  fs.writeFileSync('~/calls/task.ts', task)
  fs.writeFileSync('~/calls/form.ts', form)
}
```

Then here, the `test` function makes a call to a `host` with the
payload.

```ts
import Call from '@cluesurf/call'
import Load from '~/calls/load'
import Task from '~/calls/task'
import { LoadChatBase } from '~/calls/form'

const work = new Call({
  host: 'http://localhost:3000',
  // set auth token POST
  code: process.env.WORK_CODE
  // load the generated types for making calls.
  load: Load,
  task: Task,
})

async function test() {
  const back = await work.call({
    hook: {
      read_chat_by_code_hook: {
        take: {
          find: {
            form: 'test',
            link: ['code', 'hook'],
            test: '=',
            bond: 'tibetan',
          },
        },
        load: {
          flow: {
            take: {
              curb: 1000,
              sort: [
                {
                  link: ['code', 'hook'],
                  bond: 'fall',
                }
              ]
            },
            load: {
              code: {
                load: {
                  hook: true
                }
              }
            }
          }
        }
      }
    }
  })

  const chat = back.load.read_chat_by_code_hook as LoadChatBase

  console.log(back)
  // {
  //   form: 'call_back',
  //   code: {
  //     mark: 'rise', // it's a good response
  //     call: 200
  //   },
  //   load: {
  //     read_chat_by_code_hook: {
  //       form: 'chat',
  //       code: {
  //         base: '129381983918',
  //         hook: 'tibetan',
  //         seed: 'mbdzkv'
  //       },
  //       flow: {
  //         size: 296,
  //         load: [
  //           {
  //             code: {
  //               base: '329391982911',
  //               hook: 'foo',
  //               seed: 'mbfztn'
  //             }
  //           },
  //           // ...
  //         ]
  //       }
  //     }
  //   }
  // }

  const back = await work.call<LoadChatBase>('read_chat_by_code_hook', {
    take: {
      find: {
        form: 'test',
        link: ['code', 'hook'],
        bond: 'oops',
      }
    },
  })

  console.log(back)
  // {
  //   form: 'call_back',
  //   code: {
  //     mark: 'fall', // it's a bad response
  //     call: 404
  //   },
  // }
}
```

Under the hood, this will make a `POST` request to the `host` with this
JSON body:

```ts
{
  form: 'call',
  hook: {
    read_chat_by_code_hook: {
      host: 'foo',
      deck: 'bar',
      code: '12321',
      take: {
        find: {
          form: 'test',
          link: ['code', 'hook'],
          test: '=',
          bond: 'tibetan',
        },
      },
      load: {
        code: {
          load: {
            base: true,
            hook: true,
            seed: true,
          },
        },
        flow: {
          take: {
            curb: 1000,
            sort: [
              {
                link: ['code', 'hook'],
                bond: 'fall',
              }
            ],
          },
          load: {
            code: {
              load: {
                base: true,
                hook: true,
                seed: true,
              },
            },
          },
        }
      }
    }
  }
}
```

Then you will need to implement a handler for this call in the host/deck
namespace.

```ts
import {
  ReadChatByCodeHookCallTake,
  ReadChatByCodeHookCall,
} from '~/calls/form'

export const read_chat_by_code_hook = (
  call: ReadChatByCodeHookCall,
) => {
  const callHead = ReadChatByCodeHookCallTake.parse(call)
  // do SQL stuff on these parsed inputs.
  const back = {}
  return back
}
```

We have a base tool to perform CRUD operations on each record type.

```ts
import { ReadChatCall, ReadChatCallTake } from '~/calls/form'
import mesh from '~/bindings/mesh'

export const read_chat_by_code_hook = async (
  call: ReadChatByCodeHookCall,
) => {
  const callHead = ReadChatByCodeHookCallTake.parse(call)
  // do SQL stuff on these parsed inputs.
  const back = await mesh.read(callHead)
  return back
}

export const make_chat = async (call: MakeChatByCodeHookCall) => {
  const callHead = MakeChatByCodeHookCallTake.parse(call)
  // do SQL stuff on these parsed inputs.
  const back = await mesh.read(callHead)
  return back
}

export const load_flow = async call => {
  const callHead = LoadFlow.parse(call)
  // do SQL stuff on these parsed inputs.
  const back = await mesh.read(callHead)
  return back
}
```

Perhaps the `mesh` looks like this:

```ts
const base = {
  chat,
  flow,
}

export default new Mesh(base)
```

```ts
export const read = (mesh, call) => {}

export const make = (mesh, call) => {}
```

```ts
const read_chat = (call, host) => {
  // the host can have passthrough data
}

const bind = {
  head: {
    chat: read_chat,
    chat_by_hook: read_chat_by_hook,
    make_chat,
    flow: read_flow,
  },
  chat: {
    flow: read_flow_from_chat,
  },
  flow: {
    take: read_flow_take_from_flow,
  },
}
```

```
/sources
  /calls
    /index.ts
  /rules
    /tasks
    /loads
/calls (generated)
  /read-chat-by-code
/handlers
  /read-chat-by-code
/types
  /calls
    /read-chat-by-code
      /index.ts
      /parser.ts // Input models, don't need output models

readChatByCodeHook(take)
```

## License

MIT

## cluesurf

This is being developed by the folks at [cluesurf](https://wave.bond), a
California-based project for helping humanity master information and
computation. cluesurf started off in the winter of 2008 as a spark of an
idea, to forming a company 10 years later in the winter of 2018, to a
seed of a project just beginning its development phases. It is entirely
bootstrapped by working full time and running
[Etsy](https://etsy.com/shop/cluesurf) and
[Amazon](https://www.amazon.com/s?rh=p_27%3AMount+Build) shops. Also
find us on [Facebook](https://www.facebook.com/cluesurf),
[Twitter](https://twitter.com/cluesurf), and
[LinkedIn](https://www.linkedin.com/company/cluesurf). Check out our
other GitHub projects as well!
