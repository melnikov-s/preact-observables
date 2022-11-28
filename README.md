# preact-observables

`preact-observables` enables the use of deep observable objects for `@preact/signals` supporting objects, arrays, `Map`, `Set`, `WeakMap` and `WeakSet`.


## Example

When an observable object is created each property is represented by a preact `signal`, getters are automatically wrapped in a `computed` and setters and methods are performed in a `batch`.

```jsx
import from '@preact/signals'; // or '@preact/signals-react'
import {observable} from 'preact-observables';

const store = observable({
    get totalCompleted() {
        return store.todos.filter(todo => todo.completed).length;
    },
    addTodo(title) {
        store.todos.push({title: newTodo, completed: false})
    },
    removeTodo(index) {
        store.todos.splice(index, 1);
    },
    todos: [
        {title: "drink a cup of coffee", completed: true},
        {title: "get some fresh air", completed: false}
    ]
});

function Todos() {
    const [newTodo, setNewTodo] = useState();

    return (
        <div>
            <h1>Todos</h1>
            <div>
                <label>Create:</label>
                <input value={newTodo} onChange={e => setNewTodo(e.target.value)} />
                <button onClick={() => {
                    store.addTodo(newTodo);
                    setNewTodo('');
                }}>Add</button>
            </div>
            <ul>
             {store.todos.map((todo, index) => (
                <li key={todo.title}>
                    <checkbox value={todo.completed} onChange={e => todo.completed = e.target.checked}/>
                    <span>{todo.title}</span>
                    <button onClick={() => store.removeTodo(index)}>delete</button>
                </li>
            ))}
             <ul>
             <h2>Total Completed: {store.totalCompleted}</h2>
        </div>
    )
}
```



## Using Classes

`preact-observables` also allows you to model your data with classes. Extend from the `Observable` base class and every property will be a signal, getters will be computed and methods/setters will be batched.

```jsx
import { Observable } from "preact-observables";
import { effect } from "@preact/signals-core";

class Person extends Observable {
  firstName;
  lastName;

  constructor(firstName, lastName) {
    super();

    this.firstName = firstName;
    this.lastName = lastName;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  setName(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
  }
}

const person = new Person("Alice", "Smith");

effect(() => {
  console.log(person.fullName);
});

// logs "Alice Jones"
person.setName("Alice", "Jones");
```

## Working with Signals

Each observable is made up of multiple signals. A signal is created for each property and computed getters. Signals that represent a primitive type (string, number, etc) can be passed down directly on attributes and text elements and when those signals change only the individual DOM nodes need to be updated.

You can retrieve the signal from an observable object with the `getSignal` function:

```javascript
const todos = observable(["drink coffee", "take a walk"]);

function Todos() {
  return todos.map((_, index) => <div>{getSignal(todos, index)}</div>);
}

todos[1] = "stay at home"; // now only a single div element will update instead of the entire component
```

As a convenience you can also use the `$prop` syntax to access signals on objects:

```javascript
const todos = observable([
  { title: "drink coffee", completed: true },
  { title: "take a walk", completed: false },
]);

function Todos() {
  return todos.map((todo) => <div>{todo.$title}</div>);
}

todos[1].title = "stay at home"; // now only a single div element will update instead of the entire component
```

_Note: If you already have a property that starts with `$` in your object (eg: `$myProp`) you can access the signal using `$$` (eg: `$$myProp`)._

_typescript Note: Due to typescript limitations all `$` properties have a type of `Signal<*> | undefined` even though they will return a `Signal` at runtime. You will need to use `!` to bypass this. Though if you're only passing them to text nodes and as attributes `!` is not required_

## Integration with Preact / React

`preact-observables` work with `@preact/signals-core` if you wish to integrate it with preact you will need to `import from '@preact/signals'` somewhere in your code. Likewise with React you'll need to `import from '@preact/signals-react'`.

## Observables under the hood

Observables and their underlying signals are always lazily initialized upon access. They are initialized from the source object that is passed into `observable`. The source object is then permanently associated to a single observable reference. Observing it again will return the same observable reference.

```javascript
const obj = { value: "prop" };
observable(obj) === observable(obj); // true
```

Mutating the observable will also mutate the source but `preact-observable` will never write observable values back to the source object.

```javascript
const obj = { inner: null };
const inner = { value: "prop2" };

const observableObj = observable(obj);
const observableInner = observable(inner);

observableObj.inner = observableInner;

obj.inner === observableObj.inner; // false
obj.inner === inner; // true
observable(obj.inner) === observableInner; // true
```

This behavior makes `preact-observables` ideal for observing existing/shared objects as they will not be mutated when making them observable nor will they ever get into a state where the original source object has both observable and non-observable values.

## Observable Array performance

Many deeply observable proxy implementations use the same implementation to deal with both objects and arrays. The consequence of doing so means accessing `Array.prototype` methods will run entirely on the proxied array which results in orders of magnitude slower performance when compared to calling those same methods on a native array.

`preact-observables` utilizes the underlying source to execute common `Array.prototype` methods. This is purely an implementation detail but what it amounts to is performance that is closer to calling those methods on a native array.

## Performance escape hatches

When dealing with observable objects there's an added overhead for every read and write operation that is performed as well as the overhead that's introduces by reading/writing to signals. While this overhead is significant it rarely becomes a performance issue as in typical web applications data processing of state/domain objects is not the bottle neck. Yet there might be situations where heavy data manipulation is required and doing so on an observable proxied object will be significantly slower then working with plain JavaScript objects.

`preact-observables` offers a performance escape hatch in these situation. Since observables are proxied shells over the original source we can modify the source object directly and then manually signal that the observable has been changed so that all reactions that depend on it can be ran. This can be achieved using `reportChanged`.

```javascript
import { source, reportChanged } from "preact-observables";
import {effect} from "@preact/preact-signals";

const bigObj = observable(createAnExpensiveObject());

effect(() => {
    console.log(Object.keys(bigObj).length);
});

// get the original plain object source for this observable
const bigObjSource = source(bigObj);
// perform expensive mutations on the plain javascript object (fast)
performExpensiveMutations(bigObjSource);
reportChanged(bigObj); // manually signal to reactions that our object has changed and those reactions that depend on it need to re-run
```

`preact-observables` also exports `reportObserved` which is the read equivalent to `reportChanged`. It can be used when performing an expensive derivation within a reaction. `reportObserved` can also deeply observe all nested objects with `reportObserved(obj, {deep: true})`

## API

`observable(obj)`

Return an observable proxy for a given object. Can be a plain object, array, map, set, date, weakmap or weakset. Resulting proxy will be deeply observed.

`source(obj)`

Returns the original source from an observable object.

`isObservable(obj)`

Returns a `true` if the passed in object is observable and `false` otherwise

`getSignal(obj, key)`

Returns the underlying preact signal or computed from an observable object

`reportChanged(obj)`

Force a change on the observable object so that any effects that depend on it can re-run

`reportObserved(obj, options?: {deep?: boolean})`

Force an observation on the observable object so that it can be added to an active reaction.
