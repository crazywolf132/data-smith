import QueryBuilder from '.';

describe('QueryBuilder', () => {
    interface Person {
        id: number;
        name: string;
        age: number;
        departmentId: number;
    }

    const data: Person[] = [
        { id: 1, name: 'Alice', age: 30, departmentId: 1 },
        { id: 2, name: 'Bob', age: 25, departmentId: 2 },
        { id: 3, name: 'Charlie', age: 35, departmentId: 1 },
    ];

    interface Department {
        id: number;
        name: string;
    }

    const departments: Department[] = [
        { id: 1, name: 'HR' },
        { id: 2, name: 'Engineering' },
    ];

    test('select', async () => {
        const query = new QueryBuilder(data);
        const result = await query.select('name', 'departmentId').toArray();

        expect(result).toEqual([
            { name: 'Alice', departmentId: 1 },
            { name: 'Bob', departmentId: 2 },
            { name: 'Charlie', departmentId: 1 },
        ]);
    });

    test('from', () => {
        const query = new QueryBuilder();
        const result = query.from(data).toArray();
        expect(result).toEqual(data);
    })

    test('where', async () => {
        const query = new QueryBuilder(data);
        const result = await query.where((person) => person.age > 25).toArray();

        expect(result).toEqual([
            { id: 1, name: 'Alice', age: 30, departmentId: 1 },
            { id: 3, name: 'Charlie', age: 35, departmentId: 1 },
        ]);
    });

    test('orderBy', async () => {
        const query = new QueryBuilder(data);
        const result = await query.orderBy('departmentId', true).toArray();

        expect(result).toEqual([
            { id: 2, name: 'Bob', age: 25, departmentId: 2 },
            { id: 1, name: 'Alice', age: 30, departmentId: 1 },
            { id: 3, name: 'Charlie', age: 35, departmentId: 1 },
        ]);
    });

    test('skip', async () => {
        const query = new QueryBuilder(data);
        const result = await query.skip(1).toArray();

        expect(result).toEqual([
            { id: 2, name: 'Bob', age: 25, departmentId: 2 },
            { id: 3, name: 'Charlie', age: 35, departmentId: 1 },
        ]);
    });

    test('take', async () => {
        const query = new QueryBuilder(data);
        const result = await query.take(2).toArray();

        expect(result).toEqual([
            { id: 1, name: 'Alice', age: 30, departmentId: 1 },
            { id: 2, name: 'Bob', age: 25, departmentId: 2 },
        ]);
    });

    test('page', async () => {
        const query = new QueryBuilder(data);
        const result = query.orderBy('age').page(0, 1).toArray();

        expect(result).toEqual([
            { id: 2, name: 'Bob', age: 25, departmentId: 2 },
        ]);
    });

    test('count', async () => {
        const query = new QueryBuilder(data);
        const result = await query.count();

        expect(result).toEqual(3);
    });

    test('sum', async () => {
        const query = new QueryBuilder(data);
        const result = await query.sum('age');

        expect(result).toEqual(90);
    });

    test('avg', async () => {
        const query = new QueryBuilder(data);
        const result = await query.avg('age');

        expect(result).toEqual(30);
    });

    test('max', async () => {
        const query = new QueryBuilder(data);
        const result = await query.max('age');

        expect(result).toEqual({ id: 3, name: 'Charlie', age: 35, departmentId: 1 });
    });

    test('min', async () => {
        const query = new QueryBuilder(data);
        const result = await query.min('age');

        expect(result).toEqual({ id: 2, name: 'Bob', age: 25, departmentId: 2 });
    });

    test('any', async () => {
        const query = new QueryBuilder(data);
        const result = await query.any();

        expect(result).toBe(true);
    });

    test('all', async () => {
        const query = new QueryBuilder(data);
        const result = await query.all((person) => person.age > 20);

        expect(result).toBe(true);
    });

    test('first', async () => {
        const query = new QueryBuilder(data);
        const result = await query.first();

        expect(result).toEqual({ id: 1, name: 'Alice', age: 30, departmentId: 1 });
    });

    test('last', async () => {
        const query = new QueryBuilder(data);
        const result = await query.last();

        expect(result).toEqual({ id: 3, name: 'Charlie', age: 35, departmentId: 1 });
    });

    test('groupBy', async () => {
        const query = new QueryBuilder(data);
        const result = await query.groupBy((item) => item.departmentId).toArray();

        expect(result).toEqual([
            {
                key: 1,
                group: [
                    { id: 1, name: 'Alice', age: 30, departmentId: 1 },
                    { id: 3, name: 'Charlie', age: 35, departmentId: 1 },
                ],
            },
            {
                key: 2,
                group: [
                    { id: 2, name: 'Bob', age: 25, departmentId: 2 },
                ],
            },
        ]);
    });

    test('join', async () => {
        const query = new QueryBuilder(data);
        const result = query.join<Department>(
            departments,
            (person) => person.departmentId,
            (department) => department.id,
            (person, department) => ({
                ...person,
                departmentName: department.name,
            })
        ).toArray();

        expect(result).toEqual([
            { id: 1, name: 'Alice', age: 30, departmentId: 1, departmentName: 'HR' },
            { id: 2, name: 'Bob', age: 25, departmentId: 2, departmentName: 'Engineering' },
            { id: 3, name: 'Charlie', age: 35, departmentId: 1, departmentName: 'HR' },
        ]);
    });

    test('join - QueryBuilder x QueryBuilder', async () => {
        const userQuery = new QueryBuilder(data);
        const departmentQuery = new QueryBuilder(departments);
        const result = userQuery.join<Department>(
            departmentQuery,
            (person) => person.departmentId,
            (department) => department.id,
            (person, department) => ({
                ...person,
                departmentName: department.name
            })
        ).toArray();

        expect(result).toEqual([
            { id: 1, name: 'Alice', age: 30, departmentId: 1, departmentName: 'HR' },
            { id: 2, name: 'Bob', age: 25, departmentId: 2, departmentName: 'Engineering' },
            { id: 3, name: 'Charlie', age: 35, departmentId: 1, departmentName: 'HR' },
        ]);
    })

    test('toGroup', async () => {
        const query = new QueryBuilder(data);
        const result = await query.toGroup(user => user.departmentId, (key, users) => ({ departmentId: key, users }))
        expect(result).toEqual([
            {
                key: 1,
                group: {
                    departmentId: 1,
                    users: [
                        { id: 1, name: 'Alice', age: 30, departmentId: 1 },
                        { id: 3, name: 'Charlie', age: 35, departmentId: 1 }
                    ]
                }
            },
            {
                key: 2,
                group: {
                    departmentId: 2,
                    users: [{ id: 2, name: 'Bob', age: 25, departmentId: 2 }]
                }
            }
        ])
    })

});
