
type Listener<T> = (arg: T) => any;
type Unsubscribe = () => void;

export class Hook<T> {
    private listeners: Array<Listener<T>> = [];

    public fire = (arg: T): void => {
        this.listeners.forEach((l) => l(arg));
    }

    public on = (listener: Listener<T>): Unsubscribe => {
        this.listeners.push(listener);
        return () => this.unsubscribe(listener);
    }

    /** Pipe the data to another hook */
    public pipe = (hook: Hook<T>): Unsubscribe => {
        const listener = (arg: T) => hook.fire(arg);
        return this.on(listener);
    }

    private unsubscribe = (listener: Listener<T>): void => {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }
}
