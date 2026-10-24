/**
 * Суффиксное дерево — сжатый бор, построенный на всех суффиксах строки.
 *
 * Если сложить все суффиксы строки в обычный бор, получится суффиксный бор: любая подстрока строки —
 * это префикс какого-то суффикса, поэтому поиск подстроки превращается в
 * спуск по дереву. Проблема в памяти: у строки длины n суффиксов n, их
 * суммарная длина n(n+1)/2, то есть узлов получается O(n^2).
 *
 * Суффиксное дерево решает эту проблему сжатием: цепочки узлов, у которых
 * ровно один ребёнок, склеиваются в одно ребро. Ребро хранит не символ, а
 * пару индексов [start, end) в исходной строке, то есть ссылку на кусок
 * строки, а не его копию. После сжатия листьев ровно n (по одному на суффикс),
 * а у каждой внутренней вершины минимум два ребёнка, поэтому внутренних
 * вершин меньше n, и всего узлов меньше 2n — память O(n).
 *
 * Обозначения: n — длина строки, m — длина подстроки/образца.
 *
 * Сложность:
 *   построение              O(n^2) в худшем случае (наивный алгоритм вставки
 *                           суффиксов; алгоритм Укконена даёт O(n), но он
 *                           существенно сложнее и для задачи не требуется)
 *   contains(pattern)       O(m)
 *   countOccurrences(p)     O(m)
 *   lce(i, j)               O(1) после предобработки O(n log n)
 *   память                  O(n) узлов + O(n log n) на таблицу для LCA
 *
 * Чтобы каждый суффикс заканчивался в листе, к строке приписывается
 * уникальный символ-ограничитель (по умолчанию '\u0000').
 */

class Node {
    readonly children = new Map<string, Node>();
    /** Индекс суффикса, если узел — лист; иначе -1. */
    suffixIndex = -1;

    constructor(
        /** Начало куска строки на ребре, ведущем в этот узел. */
        public start: number,
        /** Конец куска (не включительно). */
        public end: number,
        public parent: Node | null,
        /** Длина строки от корня до этого узла. */
        public depth: number,
    ) {}

    get edgeLength(): number {
        return this.end - this.start;
    }
}

export class SuffixTree {
    private readonly text: string;
    private readonly root: Node;
    private readonly leaves: Node[] = [];

    private nodes = 1;

    private eulerNodes: Node[] = [];
    private eulerDepths: number[] = [];
    private firstVisit = new Map<Node, number>();
    private sparse: Int32Array[] = [];
    private lcaReady = false;

    constructor(source: string, terminator = '\u0000') {
        this.text = source + terminator;
        this.root = new Node(0, 0, null, 0);

        for (let i = 0; i < this.text.length; i++) {
            this.insertSuffix(i);
        }
    }

    /** Длина строки вместе с ограничителем. */
    get length(): number {
        return this.text.length;
    }

    /** Количество узлов дерева — для оценки памяти. */
    get nodeCount(): number {
        return this.nodes;
    }

    /** Есть ли подстрока в строке. O(m) */
    contains(pattern: string): boolean {
        return pattern.length === 0 || this.findNode(pattern) !== null;
    }

    /** Сколько раз подстрока встречается в строке. O(m) */
    countOccurrences(pattern: string): number {
        if (pattern.length === 0) return this.text.length;

        const node = this.findNode(pattern);
        if (node === null) return 0;

        let count = 0;
        const stack: Node[] = [node];

        while (stack.length > 0) {
            const current = stack.pop() as Node;

            if (current.suffixIndex !== -1) {
                count++;
                continue;
            }

            for (const child of current.children.values()) {
                stack.push(child);
            }
        }

        return count;
    }

    /**
     * Наибольшее общее расширение (longest common extension): длина
     * наибольшего общего префикса суффиксов, начинающихся в позициях i и j.
     *
     * Ровно это и есть глубина наименьшего общего предка (LCA) листьев,
     * отвечающих этим суффиксам: путь от корня до LCA — общий для обоих
     * суффиксов, дальше они расходятся. O(1) после предобработки.
     */
    lce(i: number, j: number): number {
        if (i === j) return this.text.length - i;
        if (i < 0 || j < 0 || i >= this.text.length || j >= this.text.length) return 0;

        if (!this.lcaReady) this.prepareLca();

        const a = this.firstVisit.get(this.leaves[i]) as number;
        const b = this.firstVisit.get(this.leaves[j]) as number;
        const [from, to] = a <= b ? [a, b] : [b, a];

        const level = 31 - Math.clz32(to - from + 1);
        const left = this.sparse[level][from];
        const right = this.sparse[level][to - (1 << level) + 1];
        const best = this.eulerDepths[left] <= this.eulerDepths[right] ? left : right;

        return this.eulerNodes[best].depth;
    }


    /**
     * Вставка одного суффикса: спускаемся по дереву, пока символы совпадают,
     * при частичном совпадении разрезаем ребро и создаём развилку.
     */
    private insertSuffix(suffixStart: number): void {
        const text = this.text;
        const end = text.length;

        let node = this.root;
        let pos = suffixStart;

        while (pos < end) {
            const child = node.children.get(text[pos]);

            // такого начала ещё нет — просто вешаем лист
            if (child === undefined) {
                node.children.set(text[pos], this.makeLeaf(pos, end, node, suffixStart));
                return;
            }

            // идём по ребру, пока символы совпадают
            let edgePos = child.start;
            let textPos = pos;

            while (edgePos < child.end && text[edgePos] === text[textPos]) {
                edgePos++;
                textPos++;
            }

            // ребро пройдено целиком — спускаемся ниже
            if (edgePos === child.end) {
                node = child;
                pos = textPos;
                continue;
            }

            // совпало частично — разрезаем ребро пополам
            const middle = new Node(child.start, edgePos, node, node.depth + (edgePos - child.start));
            this.nodes++;

            node.children.set(text[child.start], middle);
            child.start = edgePos;
            child.parent = middle;
            middle.children.set(text[edgePos], child);
            middle.children.set(text[textPos], this.makeLeaf(textPos, end, middle, suffixStart));
            return;
        }
    }

    private makeLeaf(start: number, end: number, parent: Node, suffixIndex: number): Node {
        const leaf = new Node(start, end, parent, parent.depth + (end - start));
        leaf.suffixIndex = suffixIndex;
        this.leaves[suffixIndex] = leaf;
        this.nodes++;
        return leaf;
    }

    /** Спуск по дереву по символам образца. O(m) */
    private findNode(pattern: string): Node | null {
        const text = this.text;
        let node = this.root;
        let pos = 0;

        while (pos < pattern.length) {
            const child = node.children.get(pattern[pos]);
            if (child === undefined) return null;

            let edgePos = child.start;

            while (edgePos < child.end && pos < pattern.length) {
                if (text[edgePos] !== pattern[pos]) return null;
                edgePos++;
                pos++;
            }

            node = child;
        }

        return node;
    }


    /**
     * Эйлеров обход дерева + разреженная таблица минимумов.
     * Предобработка O(n log n) по времени и памяти, запрос LCA — O(1).
     */
    private prepareLca(): void {
        this.eulerTour();

        const size = this.eulerDepths.length;
        const levels = Math.max(1, 32 - Math.clz32(size));

        this.sparse = [new Int32Array(size)];
        for (let i = 0; i < size; i++) this.sparse[0][i] = i;

        for (let level = 1; level < levels; level++) {
            const span = 1 << level;
            const previous = this.sparse[level - 1];
            const current = new Int32Array(Math.max(0, size - span + 1));

            for (let i = 0; i + span <= size; i++) {
                const left = previous[i];
                const right = previous[i + (span >> 1)];
                current[i] = this.eulerDepths[left] <= this.eulerDepths[right] ? left : right;
            }

            this.sparse.push(current);
        }

        this.lcaReady = true;
    }

    /** Нерекурсивный обход: рекурсия на длинных строках переполнила бы стек. */
    private eulerTour(): void {
        const stack: Array<{ node: Node; children: Node[]; index: number; treeDepth: number }> = [
            { node: this.root, children: [...this.root.children.values()], index: 0, treeDepth: 0 },
        ];

        this.visit(this.root, 0);

        while (stack.length > 0) {
            const frame = stack[stack.length - 1];

            if (frame.index === frame.children.length) {
                stack.pop();
                if (stack.length > 0) {
                    const parent = stack[stack.length - 1];
                    this.visit(parent.node, parent.treeDepth);
                }
                continue;
            }

            const child = frame.children[frame.index++];
            const childDepth = frame.treeDepth + 1;

            this.visit(child, childDepth);
            stack.push({ node: child, children: [...child.children.values()], index: 0, treeDepth: childDepth });
        }
    }

    private visit(node: Node, treeDepth: number): void {
        if (!this.firstVisit.has(node)) {
            this.firstVisit.set(node, this.eulerNodes.length);
        }

        this.eulerNodes.push(node);
        this.eulerDepths.push(treeDepth);
    }
}
