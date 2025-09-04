# JavaScript Tree Library

A Library for Tree data structure.

## Installation

```bash
npm i @hyeonwoo/js-tree

# or

yarn add @hyeonwoo/js-tree
```

# BSTree (Binary Search Tree)

## Usage

```javascript
const { BSTree } = require("@hyeonwoo/js-tree");

// if you using TypeScript
import { BSTree } from "@hyeonwoo/js-tree";

// initial data using make BSTree instance (optional)
const initialData = {
  key: 1,
  data: null,
  left: null,
  right: {
    key: 2,
    data: null,
    left: null,
    right: null,
  },
};

const tree = new BSTree(initialData);

tree.insert(3, "any custom data (optional)");

tree.search(3);

tree.traverse("pre", (node) => console.log(node));

const inOrderedKeyList = tree.traverse("in");
console.log(inorderedKeyList); // [1, 2, 3]

const outOrderedKeyList = tree.traverse("out");
console.log(inorderedKeyList); // [3, 2, 1]

tree.traverse("post");

tree.deleteByKey(3);

tree.deleteByKey(2, { cascade: true }); // it will delete 2 and its chilren: 3.
```
