class BSTreeNode {
  constructor(key, data) {
    this.key = key;
    this.left = null;
    this.right = null;
    this.data = data ?? null;
  }

  redirect(newKey) {
    // 중복 방지
    if (newKey === this.key)
      return {
        node: this,
        direction: 0,
        redirect: false,
      };

    // redirect to left
    if (newKey < this.key) {
      if (this.left === null)
        return {
          node: this,
          direction: -1,
          redirect: false,
        };

      return {
        node: this.left,
        direction: -1,
        redirect: true,
      };
    }

    // redirect to right
    if (newKey > this.key) {
      if (this.right === null)
        return {
          node: this,
          direction: 1,
          redirect: false,
        };

      return {
        node: this.right,
        direction: 1,
        redirect: true,
      };
    }
  }

  getLeftLeaf(node = this) {
    let currentNode = node;
    while (currentNode.left) {
      currentNode = currentNode.left;
    }
    return currentNode;
  }

  getRightLeaf(node = this) {
    let currentNode = node;
    while (currentNode.right) {
      currentNode = currentNode.right;
    }
    return currentNode;
  }
}

class BSTree {
  constructor(initialData) {
    this.root = null;

    if (!initialData) return;

    this.root = this.initialize(initialData);
  }

  initialize(initialData) {
    const node = new BSTreeNode(initialData.key, initialData.data);
    if (initialData.left) node.left = this.initialize(initialData.left);
    if (initialData.right) node.right = this.initialize(initialData.right);

    return node;
  }

  insert(newKey, data) {
    if (!this.root) {
      this.root = new BSTreeNode(newKey, data);
      return { depth: 0 };
    }

    let result = null;
    let currentNode = this.root;
    let depth = 0;
    while (true) {
      depth++;
      result = currentNode.redirect(newKey);
      currentNode = result.node;

      if (!result.redirect) {
        if (result.direction === 0) break;

        currentNode[result.direction === -1 ? "left" : "right"] =
          new BSTreeNode(newKey, data);
        break;
      }
    }

    return { depth };
  }

  traverse(orderWay, cb) {
    if (!this.root) return [];

    const result = [];
    const stack = [];
    let currentNode = this.root;
    switch (orderWay) {
      case "pre":
        while (true) {
          if (!currentNode) {
            if (!stack.length) break;

            currentNode = stack.pop();
          }

          if (cb) cb(currentNode);
          result.push(currentNode.key);

          if (currentNode.right) stack.push(currentNode.right);
          currentNode = currentNode.left;
        }
        return result;
      case "in":
        while (true) {
          let isPopped = false;
          if (!currentNode) {
            if (!stack.length) break;

            currentNode = stack.pop();
            isPopped = true;
          }

          if (isPopped) {
            if (cb) cb(currentNode);
            result.push(currentNode.key);
            currentNode = currentNode.right;

            continue;
          }

          stack.push(currentNode);
          currentNode = currentNode.left;
        }

        return result;
      case "out":
        while (true) {
          let isPopped = false;
          if (!currentNode) {
            if (!stack.length) break;

            currentNode = stack.pop();
            isPopped = true;
          }

          if (isPopped) {
            if (cb) cb(currentNode);
            result.push(currentNode.key);
            currentNode = currentNode.left;

            continue;
          }

          stack.push(currentNode);
          currentNode = currentNode.right;
        }

        return result;
      case "post":
        const stackPost = [];
        while (true) {
          if (!currentNode) {
            if (!stackPost.length) break;

            const popped = stackPost.pop();
            currentNode = popped.node;

            if (popped.isHead) {
              if (cb) cb(currentNode);
              result.push(currentNode.key);
              currentNode = null;
              continue;
            }
          }

          stackPost.push({ node: currentNode, isHead: true });
          if (currentNode.right)
            stackPost.push({ node: currentNode.right, isHead: false });
          currentNode = currentNode.left;
        }

        return result;
      default:
        return [];
    }
  }

  search(key) {
    if (!this.root) return null;

    let currentNode = this.root;
    let parentNode = null;
    let direction = null;
    let depth = 0;
    while (true) {
      if (currentNode.key === key)
        return { node: currentNode, parentNode, direction, depth };

      if (key < currentNode.key) {
        if (currentNode.left === null)
          return {
            node: null,
            parentNode: currentNode,
            direction: null,
            depth,
          };
        parentNode = currentNode;
        currentNode = currentNode.left;
        direction = -1;
        depth++;
      }

      if (key > currentNode.key) {
        if (currentNode.right === null)
          return {
            node: null,
            parentNode: currentNode,
            direction: null,
            depth,
          };
        parentNode = currentNode;
        currentNode = currentNode.right;
        direction = 1;
        depth++;
      }
    }
  }

  deleteByKey(key, options) {
    if (!this.root) return false;
    const found = this.search(key);
    if (!found.node) return false;

    const cascade = options?.cascade ?? false;

    found.parentNode[found.direction === -1 ? "left" : "right"] = null;
    if (cascade) return true;

    // not cascade
    found.parentNode[found.direction === -1 ? "left" : "right"] =
      found.node.right;
    found.node.right.getLeftLeaf().left = found.node.left;

    return true;
  }
}

module.exports = {
  BSTree,
  BSTreeNode,
};
