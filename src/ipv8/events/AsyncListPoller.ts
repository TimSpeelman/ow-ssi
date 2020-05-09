import { isEqual } from "lodash";
import { Hook } from "../../util/Hook";
import { interval, IntervalSubscription } from "../../util/interval";

/** Polls some list of items, fires an event every time a new item is found. */
export class AsyncListPoller<T> {
    public hook: Hook<T> = new Hook();

    private interval: IntervalSubscription;

    /** Latest result of poll */
    private cache: T[] = [];

    constructor(protected poll: () => Promise<T[]>, protected compare: Comparator<T> = isEqual) { }

    start = (intervalInMillis: number) => {
        this.interval = interval(intervalInMillis)
            .subscribe(() => this.processResults());
    }

    stop = () => {
        if (this.interval) {
            this.interval.unsubscribe();
        } else {
            console.log("Poller already stopped");
        }
    }

    protected processResults = async () => {
        const results = await this.poll();
        results.forEach(result => {
            if (!this.cacheHas(result)) {
                this.hook.fire(result);
            }
        });
        this.cache = results;
    }

    protected cacheHas = (a: T): boolean =>
        !!this.cache.find(b => this.compare(a, b));

}

type Comparator<T> = (a: T, b: T) => boolean;
