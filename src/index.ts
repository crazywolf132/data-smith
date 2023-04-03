/**
 * A generic query interface that defines the methods for building queries.
 */
type Query<T, K = any, G = any> = {
    from: (items: T[]) => Query<T, K, G>,
    select: <P extends keyof T>(...keys: P[]) => Query<Pick<T, P>, K, G>,
    where: (predicate: (item: T) => boolean) => Query<T, K, G>,
    orderBy: <P extends keyof T>(key: P, descending?: boolean) => Query<T, K, G>,
    skip: (count: number) => Query<T, K, G>,
    take: (count: number) => Query<T, K, G>,
    toArray: () => T[],
    groupBy: (keySelector: (item: T) => K) => Query<{ key: K; group: G }, K, G>,
    join: <U>(other: U[] | Query<T, K, G>, keySelector: (item: T) => any, otherKeySelector: (item: U) => any, resultSelector: (item: T, otherItem: U) => any) => Query<any, K, G>,
    toGroup: (keySelector: (item: T) => K, groupSelector: (key: K, items: T[]) => G) => Promise<Array<{ key: K; group: G }>>,
    page: (pageIndex: number, pageSize: number) => Query<T, K, G>,
    count: () => Promise<number>,
    sum: <P extends keyof T>(key: P) => Promise<number>,
    avg: <P extends keyof T>(key: P) => Promise<number>,
    max: <P extends keyof T>(key: P) => Promise<T>,
    min: <P extends keyof T>(key: P) => Promise<T>,
    any: () => Promise<boolean>,
    all: (predicate: (item: T) => boolean) => Promise<boolean>,
    first: () => Promise<T | undefined>,
    last: () => Promise<T | undefined>,
}
/**
 * A QueryBuilder class that implements the Query interface and provides the functionality for building queries.
 */
export default class QueryBuilder<T, K = any, G = any> implements Query<T, K, G> {
    private items: T[];

    constructor(items: T[] = []) {
        this.items = items;
    }

    /**
     * Sets the data source for the query.
     *
     * @example
     * const query = new QueryBuilder().from(users);
     */
    from(items: T[]): Query<T, K, G> {
        this.items = items;
        return this;
    }

    /**
     * Selects specific properties from the items in the query.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).select("id", "name");
     */
    select<P extends keyof T>(...keys: P[]): Query<Pick<T, P>, K, G> {
        const selectedItems = this.items.map(item => {
            const selectedItem = {} as Pick<T, P>;
            keys.forEach(key => {
                selectedItem[key] = item[key];
            });
            return selectedItem;
        });

        return new QueryBuilder<Pick<T, P>, K, G>(selectedItems);
    }

    /**
     * Filters the items in the query based on a predicate function.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).where(user => user.age > 18);
     */
    where(predicate: (item: T) => boolean): Query<T, K, G> {
        const filteredItems = this.items.filter(predicate);
        return new QueryBuilder<T, K, G>(filteredItems);
    }

    /**
     * Orders the items in the query based on a key and an optional descending flag.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).orderBy("age", true);
     */
    orderBy<P extends keyof T>(key: P, descending?: boolean): Query<T, K, G> {
        const sortedItems = this.items.slice().sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal === bVal) return 0;
            if (aVal > bVal) return descending ? -1 : 1;
            return descending ? 1 : -1;
        });
        return new QueryBuilder<T, K, G>(sortedItems);
    }

    /**
     * Skips a specified number of items in the query.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).skip(5);
     */
    skip(count: number): Query<T, K, G> {
        const skippedItems = this.items.slice(count);
        return new QueryBuilder<T, K, G>(skippedItems);
    }

    /**
     * Takes a specified number of items from the query.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).take(10);
     */
    take(count: number): Query<T, K, G> {
        const takenItems = this.items.slice(0, count);
        return new QueryBuilder<T, K, G>(takenItems);
    }

    /**
     * Converts the query to an array.
     *
     * @example
     * const usersArray = await new QueryBuilder<User>().from(users).toArray();
     */
    toArray(): T[] {
        return this.items;
    }

    /**
     * Groups the items in the query using the provided key and group selectors.
     *
     * @example
     * const groupedUsers = await new QueryBuilder<User>().from(users).toGroup(user => user.departmentId, (key, users) => ({ departmentId: key, users }));
     */
    async toGroup(keySelector: (item: T) => K, groupSelector: (key: K, items: T[]) => G): Promise<Array<{ key: K; group: G }>> {
        const groupsMap = new Map<K, T[]>();
        this.items.forEach(item => {
            const key = keySelector(item);
            const group = groupsMap.get(key) || [];
            group.push(item);
            groupsMap.set(key, group);
        });

        const groups: Array<{ key: K; group: G }> = [];
        groupsMap.forEach((group, key) => {
            groups.push({ key, group: groupSelector(key, group) });
        });

        return groups;
    }

    /**
     * Groups the items in the query by the provided key selector.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).groupBy(user => user.departmentId);
     */
    groupBy(keySelector: (item: T) => K): Query<{ key: K; group: G }, K, G> {
        const groupQuery = new QueryBuilder<{ key: K; group: G }, K, G>();
        groupQuery.items = this.items.reduce((groups, item) => {
            const key = keySelector(item);
            const group: any = groups.find(g => g.key === key);
            if (group) {
                group.group.push(item);
            } else {
                groups.push({ key, group: [item] as any });
            }
            return groups;
        }, [] as Array<{ key: K; group: G }>);

        return groupQuery;
    }

    // groupByKey(key: keyof T): Query<{ key: K, group: G }, K, G> {
    //     return this.groupBy(item => item[key]);
    // }
    /**
     * Joins the items in the query with another set of items based on the provided key selectors and result selector.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).join(departments, user => user.departmentId, department => department.id, (user, department) => ({ ...user, department }));
     */
    join<U>(other: U[] | Query<T, K, G> | Query<U, K, G>, keySelector: (item: T) => any, otherKeySelector: (item: U) => any, resultSelector: (item: T, otherItem: U) => any): Query<any, K, G> {
        const otherItems = other instanceof QueryBuilder ? other.items : other;
        const otherItemsMap = new Map<any, U>();
        (otherItems as any[]).forEach(item => {
            otherItemsMap.set(otherKeySelector(item), item);
        });

        const joinedItems = this.items.map(
            item => {
                const otherItem = otherItemsMap.get(keySelector(item));
                return otherItem ? resultSelector(item, otherItem) : undefined;
            }
        ).filter(item => item !== undefined);

        return new QueryBuilder<any, K, G>(joinedItems);
    }

    /**
     * Paginates the items in the query using the provided page index and page size.
     *
     * @example
     * const query = new QueryBuilder<User>().from(users).page(1, 10);
     */
    page(pageIndex: number, pageSize: number): Query<T, K, G> {
        const startIndex = pageIndex * pageSize;
        return this.skip(startIndex).take(pageSize);
    }

    /**
     * Counts the number of items in the query.
     *
     * @example
     * const count = await new QueryBuilder<User>().from(users).count();
     */
    async count(): Promise<number> {
        return this.items.length;
    }

    /**
     * Calculates the sum of the specified key in the query.
     *
     * @example
     * const ageSum = await new QueryBuilder<User>().from(users).sum("age");
     */
    async sum<P extends keyof T>(key: P): Promise<number> {
        return this.items.reduce((sum, item) => sum + Number(item[key]), 0);
    }

    /**
     * Calculates the average of the specified key in the query.
     *
     * @example
     * const averageAge = await new QueryBuilder<User>().from(users).avg("age");
     */
    async avg<P extends keyof T>(key: P): Promise<number> {
        const sum = await this.sum(key);
        const count = await this.count();
        return count === 0 ? 0 : sum / count;
    }

    /**
     * Retrieves the item with the maximum value of the specified key in the query.
     *
     * @example
     * const oldestUser = await new QueryBuilder<User>().from(users).max("age");
     */
    async max<P extends keyof T>(key: P): Promise<T> {
        return this.items.reduce((maxItem, item) => {
            if (maxItem == null) {
                return item;
            }
            return item[key] > maxItem[key] ? item : maxItem;
        }, null as T);
    }

    /**
     * Retrieves the item with the minimum value of the specified key in the query.
     *
     * @example
     * const youngestUser = await new QueryBuilder<User>().from(users).min("age");
     */
    async min<P extends keyof T>(key: P): Promise<T> {
        return this.items.reduce((minItem, item) => {
            if (minItem == null) {
                return item;
            }
            return item[key] < minItem[key] ? item : minItem;
        }, null as T);
    }

    /**
     * Determines whether any items exist in the query.
     *
     * @example
     * const anyUsers = await new QueryBuilder<User>().from(users).any();
     */
    async any(): Promise<boolean> {
        return this.items.length > 0;
    }

    /**
     * Determines whether all items in the query satisfy the provided predicate.
     *
     * @example
     * const allAdults = await new QueryBuilder<User>().from(users).all(user => user.age >= 18);
     */
    async all(predicate: (item: T) => boolean): Promise<boolean> {
        return this.items.every(predicate)
    }

    /**
     * Retrieves the first item in the query, or undefined if the query is empty.
     *
     * @example
     * const firstUser = await new QueryBuilder<User>().from(users).first();
     */
    async first(): Promise<T | undefined> {
        return this.items[0];
    }

    /**
     * Retrieves the last item in the query, or undefined if the query is empty.
     *
     * @example
     * const lastUser = await new QueryBuilder<User>().from(users).last();
     */
    async last(): Promise<T | undefined> {
        return this.items[this.items.length - 1];
    }
}