declare module "@hyeonwoo/js-tree" {
  /** the data to use when initialize the tree  */
  export type TTreeInitialData<T = any> = {
    key: number;
    left: TTreeInitialData<T> | null;
    right: TTreeInitialData<T> | null;
    data: T | null;
  };

  /** the order way to traverse the tree
   * @pre pre-order
   * @in in-order (asc)
   * @out in-order (desc)
   * @post post-order
   */
  export type TBSTreeTraverseOrderWay = "pre" | "in" | "out" | "post";

  export class BSTreeNode<T = any> {
    key: number;
    left: BSTreeNode<T> | null;
    right: BSTreeNode<T> | null;
    data: T | null;

    /** use internally when insert a new node */
    redirect(newKey: number): {
      node: BSTreeNode<T>;
      direction: -1 | 0 | 1;
      redirect: boolean;
    };

    /** get the left leaf node
     * @param `node` a start node to find the left leaf node (default: `this`)
     */
    getLeftLeaf(node?: BSTreeNode<T>): BSTreeNode<T>;

    /** get the right leaf node
     * @param `node` a start node to find the right leaf node (default: `this`)
     */
    getRightLeaf(node?: BSTreeNode<T>): BSTreeNode<T>;
  }

  export class BSTree<TData = any> {
    root: BSTreeNode<TData> | null;

    /** insert a new node
     * @returns `depth` the depth of inserted node
     */
    insert: (key: number, data?: TData) => { depth: number };

    /** traverse the tree
     * @returns `result` the array of key
     */
    traverse: (
      orderWay: TBSTreeTraverseOrderWay,
      cb?: (node: BSTreeNode<TData>) => void
    ) => BSTreeNode<TData>[];

    /** search a node by key
     * @returns `node` the found node
     * @returns `parentNode` the parent node of the found node
     * @returns `direction` which direction the found node is on the parent. `0` means the found node is ROOT. `-1` means the found node is on the left of the parent. `1` means the found node is on the right of the parent. `null` means that not found.
     * @returns `depth` the depth of the found node
     */
    search: (key: number) => {
      node: BSTreeNode<TData> | null;
      parentNode: BSTreeNode<TData> | null;
      direction: -1 | 0 | 1 | null;
      depth: number;
    };

    /** delete a node by key
     * @returns `success` whether the node is deleted successfully
     * @param `options.cascade` whether to delete the node and all its children (default: `false`)
     */
    deleteByKey: (key: number, options?: { cascade?: boolean }) => boolean;
  }
}
