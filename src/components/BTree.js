class BTreeNode {
  key;
  data;

  constructor(options) {
    if (!options?.key) throw new Error("key is required");
    this.key = options.key;
    this.data = options.data ?? null;
  }
}

class BTreeNodeGroup {
  m;
  nodes;
  children;
  parent;
  /** parent의 몇번째 자식인지 */
  idx;
  isLeaf;

  constructor(options) {
    const { m, nodes, children, parent, idx, isLeaf } = options ?? {};
    this.m = m;
    this.nodes = nodes ?? [];
    this.children = children ?? Array.from({ length: m + 1 }, () => null);
    this.parent = parent ?? null;
    this.idx = idx ?? null;
    this.isLeaf = isLeaf ?? false;
  }

  // 삽입할 그룹을 검색
  searchLeaf(key) {
    if (this.isLeaf)
      return {
        nodeGroup: this,
      };

    // 내부노드일 경우 리프를 향해 redirect하기 위해 다음 node group을 return
    // FIXME: 이진탐색으로 변경
    for (let i = 0; i < this.nodes.length; i++) {
      if (key < this.nodes[i].key)
        return {
          nextNodeGroup: this.children[i],
          idx: i,
        };
    }
    // for문에서 안나왔으면 제일 마지막 자식을 return. children은 m+1개.
    return {
      nextNodeGroup: this.children[this.nodes.length],
      idx: this.nodes.length,
    };
  }

  // key를 가지고 있다면 해당 node를, 없다면 다음 node group을 return
  search(key) {
    const found = this.nodes.find((node) => node.key === key);
    if (found) return { node: found };
    else if (this.isLeaf) return { node: null };

    // 내부노드일 경우 리프를 향해 redirect하기 위해 다음 node group을 return
    // FIXME: 이진탐색으로 변경
    for (let i = 0; i < this.nodes.length; i++) {
      if (key < this.nodes[i].key)
        return {
          nextNodeGroup: this.children[i],
        };
    }
    // for문에서 안나왔으면 제일 마지막 자식을 return. children은 m+1개.
    return { nextNodeGroup: this.children[this.nodes.length] };
  }

  // 중앙값 찾기 (key, index)
  findMidian() {
    if (this.nodes.length === 0) return null;
    if (this.nodes.length === 1 || this.nodes.length === 2)
      return { key: this.nodes[0].key, index: 0 };

    const middleIndex = Math.floor((this.nodes.length + 1) / 2) - 1;
    return { key: this.nodes[middleIndex].key, index: middleIndex };
  }

  insertNode(node) {
    const idx = this.nodes.findIndex((n) => n.key > node.key);
    if (idx !== -1) {
      this.nodes.splice(idx, 0, node);
      this.children.splice(idx, 0, null);
    } else this.nodes.push(node);

    return idx === -1 ? this.nodes.length - 1 : idx;
  }

  setChild(idx, child) {
    this.children[idx] = child;
  }
}

class BTree {
  m;
  rootGroup;

  constructor(options) {
    const { m } = options ?? {};
    this.m = m ?? 3;
    this.rootGroup = null;
  }

  insert(key, data) {
    if (!this.rootGroup) {
      const node = new BTreeNode({ key, data });
      this.rootGroup = new BTreeNodeGroup({
        m: this.m,
        nodes: [node],
        children: [],
        parent: null,
        isLeaf: true,
      });
      return true;
    }

    // 삽입할 leaf node group 결정
    let leafNodeGroup = this.rootGroup;
    while (true) {
      const { nodeGroup, nextNodeGroup } = leafNodeGroup.searchLeaf(key);
      if (nodeGroup) {
        leafNodeGroup = nodeGroup;
        break;
      }

      leafNodeGroup = nextNodeGroup;
    }

    // leaf node group 안에 삽입

    // 일단 넣고
    const idx = leafNodeGroup.nodes.findIndex((n) => n.key > key);
    if (idx !== -1)
      leafNodeGroup.nodes.splice(idx, 0, new BTreeNode({ key, data }));
    else leafNodeGroup.nodes.push(new BTreeNode({ key, data }));

    if (leafNodeGroup.nodes.length < this.m + 1) return true;

    // 넘쳤으면 분할
    /**
     * [분할 과정]
     * 1. leaf node group에서 중앙값 찾기
     * 2. 중앙값을 parent로 옮김
     * 3. 중앙값 오른쪽 노드들을 새로운 leaf node group으로 옮김
     * 4. 중앙값 왼쪽 노드들을 기존 leaf node group으로 옮김
     */

    let childNodeGroup = leafNodeGroup;
    while (true) {
      const { key: middleKey, index: middleIndex } =
        childNodeGroup.findMidian();
      const midianNode = childNodeGroup.nodes[middleIndex];

      let parentGroup =
        childNodeGroup.parent ||
        new BTreeNodeGroup({
          m: this.m,
          nodes: [],
          children: [],
          parent: null,
          isLeaf: false,
        });
      // 자식과 부모의 연결을 먼저 끊고
      if (childNodeGroup.parent)
        parentGroup.children[childNodeGroup.idx] = null;
      else this.rootGroup = parentGroup;
      // 부모에 node를 새로 삽입: 삽입된 idx를 반환
      const midianNodeIdx = parentGroup.insertNode(midianNode);

      const leftNodes = childNodeGroup.nodes.slice(0, middleIndex);
      const rightNodes = childNodeGroup.nodes.slice(middleIndex + 1);
      if (leftNodes.length > 0) {
        const leftNodeGroup = new BTreeNodeGroup({
          m: this.m,
          nodes: leftNodes,
          children: [],
          parent: childNodeGroup.parent,
          isLeaf: true,
        });
        parentGroup.setChild(midianNodeIdx, leftNodeGroup);
      }
      if (rightNodes.length > 0) {
        const rightNodeGroup = new BTreeNodeGroup({
          m: this.m,
          nodes: rightNodes,
          children: [],
          parent: childNodeGroup.parent,
          isLeaf: true,
        });
        parentGroup.setChild(midianNodeIdx + 1, rightNodeGroup);
      }

      if (parentGroup.nodes.length < this.m + 1) return true;
    }
  }

  search(key) {
    if (!this.root) return null;
    let currentNode = this.root;
    while (currentNode) {
      if (currentNode.key === key) return currentNode;
      currentNode = currentNode.children[currentNode.key < key ? 1 : 0];
    }
    return null;
  }
}
