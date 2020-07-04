
import { AsyncListPoller } from "../../src/ipv8/events/AsyncListPoller";
// import { describe, expect, it } from "../tools";

describe("AsyncListPoller", () => {

    test("should return all elements first time", (done) => {
        const feed = [["a"]];
        const expected = ["a"];
        testPollOutput(feed, expected, done);
    })

    test("should not return same element twice if persisted", (done) => {
        const feed = [["a"], ["a"], ["b"]];
        const expected = ["a", "b"];
        testPollOutput(feed, expected, done);
    })

    test("should return same element twice if after reappearance", (done) => {
        const feed = [["a"], ["b"], ["a"]];
        const expected = ["a", "b", "a"];
        testPollOutput(feed, expected, done);
    })

    test("should work for objects", (done) => {
        const feed = [[{ x: { y: 10 } }], [{ x: { y: 10 } }], [{ z: 5 }]];
        const expected = [{ x: { y: 10 } }, { z: 5 }];
        testPollOutput<any>(feed, expected, done);
    })


    // Reusable test
    function testPollOutput<T>(feedData: T[][], expected: T[], done: any) {
        const poller = new AsyncListPoller(makeFeed(feedData));
        poller.hook.on((e) => {
            try {
                const exp = expected.shift();
                expect(e).toEqual(exp);

                if (expected.length === 0) {
                    poller.stop();
                    done();
                }
            } catch (err) {
                done(err);
            }
        })
        poller.start(1);
    }
})

/** 
 * Given a queue of lists, return an async function that dequeues the next list every time it is called.
 */
function makeFeed<T>(items: T[][]) {
    const feed = items.slice();
    return () => Promise.resolve(feed.shift() || []);
}
