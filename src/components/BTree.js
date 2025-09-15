const { execSync, spawnSync } = require("child_process");

const fs = require("fs");

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
    if (child) {
      child.parent = this;
      child.idx = idx;
    }
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
        children: Array.from({ length: this.m + 1 }, () => null),
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
    if (leafNodeGroup.nodes.length <= this.m) return true;

    // 넘쳤으면 상위로 전파 분할
    let childNodeGroup = leafNodeGroup;
    while (childNodeGroup && childNodeGroup.nodes.length > this.m) {
      const { index: middleIndex } = childNodeGroup.findMidian();
      const midianNode = childNodeGroup.nodes[middleIndex];

      // 부모 결정
      let parentGroup = childNodeGroup.parent;
      if (!parentGroup) {
        parentGroup = new BTreeNodeGroup({
          m: this.m,
          nodes: [],
          children: Array.from({ length: this.m + 1 }, () => null),
          parent: null,
          isLeaf: false,
        });
        this.rootGroup = parentGroup;
      }

      // 부모에 중간 키 삽입 (children alignment는 insertNode가 처리)
      const midIdxInParent = parentGroup.insertNode(midianNode);

      // 왼/오 분할 노드 및 자식 분배
      const leftNodes = childNodeGroup.nodes.slice(0, middleIndex);
      const rightNodes = childNodeGroup.nodes.slice(middleIndex + 1);

      const leftChildren = childNodeGroup.isLeaf
        ? Array.from({ length: this.m + 1 }, () => null)
        : childNodeGroup.children.slice(0, middleIndex + 1);
      const rightChildren = childNodeGroup.isLeaf
        ? Array.from({ length: this.m + 1 }, () => null)
        : childNodeGroup.children.slice(middleIndex + 1);

      const leftGroup = new BTreeNodeGroup({
        m: this.m,
        nodes: leftNodes,
        children: leftChildren,
        parent: parentGroup,
        isLeaf: childNodeGroup.isLeaf,
      });
      const rightGroup = new BTreeNodeGroup({
        m: this.m,
        nodes: rightNodes,
        children: rightChildren,
        parent: parentGroup,
        isLeaf: childNodeGroup.isLeaf,
      });

      // 자식들의 parent/idx 재설정 (내부노드 분할 케이스)
      if (!childNodeGroup.isLeaf) {
        for (let i = 0; i < leftGroup.children.length; i++) {
          const ch = leftGroup.children[i];
          if (ch) {
            ch.parent = leftGroup;
            ch.idx = i;
          }
        }
        for (let i = 0; i < rightGroup.children.length; i++) {
          const ch = rightGroup.children[i];
          if (ch) {
            ch.parent = rightGroup;
            ch.idx = i;
          }
        }
      }

      // 부모에 좌/우 자식 연결
      parentGroup.setChild(midIdxInParent, leftGroup);
      parentGroup.setChild(midIdxInParent + 1, rightGroup);

      // 다음 반복은 부모 검사
      childNodeGroup = parentGroup;
    }

    return true;
  }

  search(key) {
    if (!this.rootGroup) return null;
    let group = this.rootGroup;
    while (group) {
      const { node, nextNodeGroup } = group.search(key);
      if (node || group.isLeaf) return node ?? null;
      group = nextNodeGroup;
    }
    return null;
  }

  traverse(orderWay, cb) {
    const root = this.rootGroup || this.root || null;
    if (!root) return [];
    const result = [];

    // 재귀호출 방식 대신 반복문을 통해 구현. 필요 시 stack, queue등의 자료구조를 추가로 사용 가능.
    // pre-order, in-order (asc), in-order (desc), post-order 네가지 구현.
    // ../BSTree.js의 traverse() 참고.
    // visit하는 노드마다 cb를 호출.

    switch (orderWay) {
      case "pre": {
        // 노드(그룹)의 키들을 먼저 방문 후, 자식들을 좌->우 순서로 방문
        const stack = [root];
        while (stack.length) {
          const group = stack.pop();
          if (!group) continue;

          for (let i = 0; i < group.nodes.length; i++) {
            const node = group.nodes[i];
            if (cb) cb(node);
            result.push(node.key);
          }

          // 자식들을 역순으로 push해서 좌측 자식이 먼저 pop되도록
          const childrenLength = group.children?.length ?? 0;
          for (let i = childrenLength - 1; i >= 0; i--) {
            const child = group.children[i];
            if (child) stack.push(child);
          }
        }
        return result;
      }
      case "in": {
        // 중위 순회(오름차순): child[0] -> key[0] -> child[1] -> key[1] ... -> child[n]
        const stack = [];
        let current = root;
        let i = 0; // 현재 그룹에서 다음으로 처리할 child index

        while (true) {
          if (current) {
            // 내부노드면 왼쪽으로 계속 내려감 (child[i])
            if (!current.isLeaf) {
              stack.push({ group: current, i });
              const nextChild = current.children?.[i] ?? null;
              current = nextChild;
              i = 0;
              continue;
            }

            // 리프 그룹이면 남은 키들을 순서대로 방문
            for (let k = i; k < current.nodes.length; k++) {
              const node = current.nodes[k];
              if (cb) cb(node);
              result.push(node.key);
            }
            current = null; // 상위로 올라감
            continue;
          }

          if (!stack.length) break;
          const { group, i: ci } = stack.pop();

          // child[ci] 처리 후 돌아왔으니, key[ci] 방문 (있다면), 다음 child[ci+1]로
          if (ci < group.nodes.length) {
            const node = group.nodes[ci];
            if (cb) cb(node);
            result.push(node.key);

            current = group.children?.[ci + 1] ?? null;
            i = 0;
            continue;
          }

          // 모든 키/자식 처리가 끝났으면 상위로 계속 진행
          current = null;
        }
        return result;
      }
      case "out": {
        // 역중위 순회(내림차순): child[n] -> key[n-1] -> child[n-1] ... -> key[0] -> child[0]
        const stack = [];
        let current = root;
        let i = 0;

        while (true) {
          if (current) {
            const rightmostChildIndex = current.nodes.length; // child[n]
            if (!current.isLeaf) {
              // 우측으로 계속 내려감 (child[n]부터 시작)
              i = rightmostChildIndex;
              stack.push({ group: current, i });
              const nextChild = current.children?.[i] ?? null;
              current = nextChild;
              i = 0;
              continue;
            }

            // 리프 그룹: 키들을 역순으로 방문
            for (let k = current.nodes.length - 1; k >= 0; k--) {
              const node = current.nodes[k];
              if (cb) cb(node);
              result.push(node.key);
            }
            current = null;
            continue;
          }

          if (!stack.length) break;
          const { group, i: ci } = stack.pop();

          // child[ci]를 마치고 올라왔음. ci>0이면 key[ci-1] 방문 후 child[ci-1]로 진행
          if (ci > 0) {
            const node = group.nodes[ci - 1];
            if (cb) cb(node);
            result.push(node.key);

            current = group.children?.[ci - 1] ?? null;
            i = 0;
            continue;
          }

          current = null;
        }
        return result;
      }
      case "post": {
        // 후위 순회: 모든 자식 방문 후, 그룹의 키들을 방문
        const stack = [{ group: root, visited: false }];
        while (stack.length) {
          const frame = stack.pop();
          const group = frame.group;
          if (!group) continue;

          if (!frame.visited) {
            // 자식들을 먼저 처리하도록 자기 자신을 visited:true로 넣고, 자식들을 역순으로 push
            stack.push({ group, visited: true });
            const childrenLength = group.children?.length ?? 0;
            for (let i = childrenLength - 1; i >= 0; i--) {
              const child = group.children[i];
              if (child) stack.push({ group: child, visited: false });
            }
            continue;
          }

          // 모든 자식 처리 후 키 방문
          for (let i = 0; i < group.nodes.length; i++) {
            const node = group.nodes[i];
            if (cb) cb(node);
            result.push(node.key);
          }
        }
        return result;
      }
      default:
        return [];
    }
  }

  toDot(options) {
    const { dir = process.cwd(), fileName = "tree" } = options;
    const dotFilePath = `${dir}/${fileName}.dot`;

    const root = this.rootGroup || this.root || null;
    if (!root) {
      const result = 'digraph G {\n  label="B-Tree (empty)";\n}';
      fs.writeFileSync(dotFilePath, result);
      return {
        dotFileContent: result,
        dotFilePath,
      };
    }

    const lines = [];
    lines.push("digraph G {");
    lines.push("  graph [rankdir=TB];");
    lines.push("  node [shape=record, fontsize=12];");

    let nodeId = 0;
    const idMap = new Map();

    function groupLabel(group) {
      // record 노드: <c0>|k0|<c1>|k1|...|<cN>
      const parts = [];
      const keys = group.nodes.map((n) => n.key);
      for (let i = 0; i < keys.length; i++) {
        parts.push(`<c${i}>`);
        parts.push(`${keys[i]}`);
      }
      parts.push(`<c${keys.length}>`);
      return parts.join("|");
    }

    // DFS로 노드와 간선 생성
    const stack = [root];
    while (stack.length) {
      const group = stack.pop();
      if (!idMap.has(group)) idMap.set(group, `n${nodeId++}`);
      const id = idMap.get(group);

      const label = groupLabel(group);
      lines.push(`  ${id} [label="${label}"];`);

      const childrenLength = group.children?.length ?? 0;
      for (let i = 0; i < childrenLength; i++) {
        const child = group.children[i];
        if (child) {
          if (!idMap.has(child)) idMap.set(child, `n${nodeId++}`);
          const cid = idMap.get(child);
          lines.push(`  ${id}:c${i} -> ${cid};`);
          stack.push(child);
        }
      }
    }

    lines.push("}");
    const result = lines.join("\n");
    fs.writeFileSync(dotFilePath, result);
    return {
      dotFileContent: result,
      dotFilePath,
    };
  }

  // Graphviz DOT 포맷으로 렌더링
  toPng(options) {
    const { dir = process.cwd(), fileName = "tree" } = options;

    const dot = this.toDot({ dir, fileName });
    const pngFilePath = `${dir}/${fileName}.png`;

    switch (process.platform) {
      case "darwin":
        const check = spawnSync("dot", ["--version"], { encoding: "utf8" });
        if (check.error)
          throw new Error(
            "Graphviz(dot)가 설치되어 있지 않습니다. 설치: brew install graphviz"
          );
        else if (check.status !== 0)
          throw new Error(
            "dot 명령 실행에 실패했습니다. 설치 또는 경로를 확인하세요: brew install graphviz"
          );

        execSync(`dot -Tpng ${dot.dotFilePath} -o ${pngFilePath}`);
        fs.unlinkSync(dot.dotFilePath);
        return { pngFilePath };
      case "win32":
        // 1) PATH 내 dot 확인
        {
          const chk = spawnSync("dot", ["--version"], { encoding: "utf8" });
          if (chk.status === 0 && !chk.error) {
            execSync(`dot -Tpng ${dot.dotFilePath} -o ${pngFilePath}`);
            fs.unlinkSync(dot.dotFilePath);
            return { pngFilePath };
          }
        }

        // 2) 일반 설치 경로/Chocolatey 경로 탐색
        const candidates = [];
        if (process.env["ProgramFiles"]) {
          candidates.push(
            `${process.env["ProgramFiles"]}\\Graphviz\\bin\\dot.exe`
          );
        }
        if (process.env["ProgramFiles(x86)"]) {
          candidates.push(
            `${process.env["ProgramFiles(x86)"]}\\Graphviz\\bin\\dot.exe`
          );
        }
        // Chocolatey 기본 경로
        candidates.push(`C:\\ProgramData\\chocolatey\\bin\\dot.exe`);

        let resolvedDot = null;
        for (const p of candidates) {
          try {
            if (fs.existsSync(p)) {
              resolvedDot = p;
              break;
            }
          } catch (_) {}
        }

        if (resolvedDot) {
          execSync(
            `"${resolvedDot}" -Tpng ${dot.dotFilePath} -o ${pngFilePath}`
          );
          fs.unlinkSync(dot.dotFilePath);
          return { pngFilePath };
        }

        throw new Error(
          "Windows에서 Graphviz(dot)를 찾지 못했습니다. 설치: winget install Graphviz.Graphviz 또는 choco install graphviz 후 새 터미널에서 다시 시도하세요."
        );
      case "linux": {
        const chk = spawnSync("dot", ["--version"], { encoding: "utf8" });
        if (chk.error || chk.status !== 0)
          throw new Error(
            "Graphviz(dot)가 설치되어 있지 않습니다. 설치 예: sudo apt-get install graphviz 또는 sudo dnf install graphviz"
          );
        execSync(`dot -Tpng ${dot.dotFilePath} -o ${pngFilePath}`);
        fs.unlinkSync(dot.dotFilePath);
        return { pngFilePath };
      }
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
}

module.exports = {
  BTree,
  BTreeNode,
  BTreeNodeGroup,
};
