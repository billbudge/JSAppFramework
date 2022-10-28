// Data model unit tests

const dataModelTests = (function () {
'use strict';

QUnit.test("dataModel extend", function() {
  const model = { root: {} };
  const test = dataModels.dataModel.extend(model);
  QUnit.assert.deepEqual(test, model.dataModel);
});

QUnit.test("dataModel ids", function() {
  const testData = {
    id: 1,
    items: [
      { id: 20, },
      { id: 2, },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  QUnit.assert.deepEqual(test, model.dataModel);
  const item = {};
  const id = test.assignId(item);
  QUnit.assert.ok(id !== 1 && id !== 2 && id !== 20);
  QUnit.assert.ok(id === item.id)
});

QUnit.test("dataModel properties", function() {
  const testData = {
    id: 1,
    prop: 'foo',
    arrayProp: [ 1, 2, 3 ],
    _anotherProp: 'bar',
    someId: 42,
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  QUnit.assert.ok(!test.isProperty(testData, 'id'));
  QUnit.assert.ok(test.isProperty(testData, 'prop'));
  QUnit.assert.ok(test.isProperty(testData, 'arrayProp'));
  QUnit.assert.ok(test.isProperty(testData, '_anotherProp'));
  QUnit.assert.ok(test.isReference(testData, 'someId'));
  const nameValues = [];
  test.visitProperties(testData, function(item, attr) { nameValues.push(attr); });
  QUnit.assert.deepEqual(nameValues, [ 'prop', 'arrayProp', '_anotherProp', 'someId' ]);
  const refValues = [];
  test.visitReferences(testData, function(item, attr) { refValues.push(attr); });
  QUnit.assert.deepEqual(refValues, [ 'someId' ]);
});

QUnit.test("dataModel children", function() {
  const testData = {
    id: 1,
    item: { id: 2, },
    arrayItems: [
      {
        id: 3,
        items: [
          { id: 4 },
          { id: 5 },
        ],
      },
      { id: 6 },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  const childIds = [];
  test.visitChildren(testData, function(item) { childIds.push(item.id); });
  QUnit.assert.deepEqual(childIds, [ 2, 3, 6 ]);
});

QUnit.test("dataModel subtrees", function() {
  const testData = {
    id: 1,
    item: { id: 2, },
    items: [
      {
        id: 3,
        items: [
          { id: 4 },
          { id: 5 },
        ],
      },
      { id: 6 },
    ],
  }
  const model = { root: testData };
  const test = dataModels.dataModel.extend(model);
  const itemIds = [];
  test.visitSubtree(testData, function(item) { itemIds.push(item.id); });
  QUnit.assert.deepEqual(itemIds, [ 1, 2, 3, 4, 5, 6 ]);
});

// Data event mixin unit tests.

QUnit.test("eventMixin", function() {
  const model = {
    onTestEvent: function() {
      this.onEvent('testEvent', function(handler) {
        handler();
      });
    },
  };
  const test = dataModels.eventMixin.extend(model);
  QUnit.assert.deepEqual(test, model);

  let count = 0;
  const handler = function() { count++; };
  model.onTestEvent();
  model.addHandler('testEvent', handler);
  QUnit.assert.deepEqual(0, count);

  model.onTestEvent();
  QUnit.assert.deepEqual(1, count);
  model.onTestEvent();
  QUnit.assert.deepEqual(2, count);

  model.removeHandler('testEvent', handler);
  model.onTestEvent();
  QUnit.assert.deepEqual(2, count);
});

// Observable model unit tests.

QUnit.test("observableModel extend", function() {
  const model = {
    root: {},
  };
  const test = dataModels.observableModel.extend(model);
  QUnit.assert.deepEqual(test, model.observableModel);
});

QUnit.test("observableModel", function() {
  const model = {
    root: {
      array: [],
    },
  };
  const test = dataModels.observableModel.extend(model);
  let change;
  test.addHandler('changed', function(change_) {
    change = change_;
  });

  test.changeValue(model.root, 'foo', 'bar');
  QUnit.assert.deepEqual(model.root, change.item);
  QUnit.assert.deepEqual('foo', change.attr);
  QUnit.assert.deepEqual(undefined, change.oldValue);
  QUnit.assert.deepEqual(model.root.foo, 'bar');

  test.insertElement(model.root, 'array', 0, 'foo');
  QUnit.assert.deepEqual(model.root, change.item);
  QUnit.assert.deepEqual('array', change.attr);
  QUnit.assert.deepEqual(0, change.index);
  QUnit.assert.deepEqual(model.root.array, [ 'foo' ]);

  test.removeElement(model.root, 'array', 0);
  QUnit.assert.deepEqual(model.root, change.item);
  QUnit.assert.deepEqual('array', change.attr);
  QUnit.assert.deepEqual(0, change.index);
  QUnit.assert.deepEqual('foo', change.oldValue);
  QUnit.assert.deepEqual(model.root.array, []);
});

// Transaction model unit tests.

QUnit.test("transactionModel extend", function() {
  const model = { root: {} };
  const test = dataModels.transactionModel.extend(model);
  QUnit.assert.deepEqual(test, model.transactionModel);
  QUnit.assert.ok(model.observableModel);
});

QUnit.test("transactionModel events", function() {
  const model = {
    root: {},
  };
  const test = dataModels.transactionModel.extend(model);
  let started, ending, ended;
  test.addHandler('transactionBegan', function(transaction) {
    QUnit.assert.ok(!started);
    QUnit.assert.ok(test.transaction);
    started = transaction;
  });
  test.addHandler('transactionEnding', function(transaction) {
    QUnit.assert.ok(started && !ending && !ended);
    ending = transaction;
  });
  test.addHandler('transactionEnded', function(transaction) {
    QUnit.assert.ok(started && ending && !ended);
    QUnit.assert.ok(!test.transaction);
    ended = transaction;
  });

  QUnit.assert.ok(!test.transaction);
  test.beginTransaction('test trans');
  QUnit.assert.ok(started);
  QUnit.assert.deepEqual(started.name, 'test trans');
  QUnit.assert.ok(test.transaction);
  QUnit.assert.deepEqual(test.transaction.name, 'test trans');

  test.endTransaction();
  QUnit.assert.ok(!test.transaction);
  QUnit.assert.ok(ending);
  QUnit.assert.ok(ended);

  let didUndo;
  test.addHandler('didUndo', function(transaction) {
    QUnit.assert.ok(!didUndo);
    didUndo = transaction;
  });
  test.undo(ended);
  QUnit.assert.deepEqual(didUndo, ended);

  let didRedo;
  test.addHandler('didRedo', function(transaction) {
    QUnit.assert.ok(!didRedo);
    didRedo = transaction;
  });
  test.redo(ended);
  QUnit.assert.deepEqual(didRedo, ended);
});

QUnit.test("transactionModel transaction", function() {
  const model = {
    root: {
      prop1: 'foo',
      array: [],
    },
  };
  const test = dataModels.transactionModel.extend(model);
  let ended;
  test.addHandler('transactionEnded', function(transaction) {
    ended = transaction;
  });

  test.beginTransaction('test trans');
  model.root.prop1 = 'bar';
  model.observableModel.onValueChanged(model.root, 'prop1', 'foo');
  model.root.array.push('a');
  model.observableModel.onElementInserted(model.root, 'array', 0);
  model.root.array.push('b');
  model.observableModel.onElementInserted(model.root, 'array', 1);
  model.root.array.push('c');
  model.observableModel.onElementInserted(model.root, 'array', 2);
  model.root.array.splice(1, 1);  // remove middle element.
  model.observableModel.onElementRemoved(model.root, 'array', 1, 'b');
  QUnit.assert.ok(!ended);
  test.endTransaction();
  QUnit.assert.ok(ended);
  test.undo(ended);
  QUnit.assert.deepEqual(model.root.prop1, 'foo');
  QUnit.assert.deepEqual(model.root.array, []);
  test.redo(ended);
  QUnit.assert.deepEqual(model.root.prop1, 'bar');
  QUnit.assert.deepEqual(model.root.array, [ 'a', 'c' ]);
});

QUnit.test("transactionModel cancel", function() {
  const model = {
    root: {},
  };
  model.prop1 = 'foo';
  const test = dataModels.transactionModel.extend(model);
  let ending, canceled;
  test.addHandler('transactionEnding', function(transaction) {
    QUnit.assert.ok(!ending);
    ending = transaction;
    test.cancelTransaction();
  });
  test.addHandler('transactionCanceled', function(transaction) {
    QUnit.assert.ok(ending);
    canceled = transaction;
  });

  test.beginTransaction('test trans');
  model.prop1 = 'bar';
  model.observableModel.onValueChanged(model, 'prop1', 'foo');
  QUnit.assert.ok(!ending && !canceled);
  test.endTransaction();
  QUnit.assert.ok(ending && canceled);
  QUnit.assert.deepEqual(model.prop1, 'foo');
});

// Referencing model unit tests.

QUnit.test("referencingModel extend", function() {
  const model = {
    root: {},
  };
  const test = dataModels.referencingModel.extend(model);
  QUnit.assert.deepEqual(test, model.referencingModel);
});

QUnit.test("referencingModel", function() {
  // Default data model references end with 'Id'.
  const child1 = { id: 2, refId: 1 },
        child2 = { id: 3, refId: 1 },
        child3 = { id: 4, firstId: 1, secondId: 3 };
  const root = {
    id: 1,
    child: null,
    items: [
      child1,
    ],
  };
  const model = { root: root };
  dataModels.observableModel.extend(model);

  const test = dataModels.referencingModel.extend(model);
  QUnit.assert.deepEqual(test.getReference(child1, 'refId'), root);
  QUnit.assert.deepEqual(test.getReferenceFn('refId')(child1), root);
  QUnit.assert.deepEqual(test.getReference(child1, 'refId'), model.referencingModel.resolveId(child1.refId));

  model.observableModel.changeValue(root, 'child', child2);
  QUnit.assert.deepEqual(test.getReference(child2, 'refId'), root);

  model.observableModel.changeValue(child2, 'refId', 2);
  QUnit.assert.deepEqual(test.getReference(child2, 'refId'), child1);

  model.observableModel.insertElement(root, 'items', root.items.length - 1, child3);
  QUnit.assert.deepEqual(test.getReference(child3, 'firstId'), root);
  QUnit.assert.deepEqual(test.getReferenceFn('firstId')(child3), root);
  QUnit.assert.deepEqual(test.getReference(child3, 'secondId'), child2);
  QUnit.assert.deepEqual(test.getReferenceFn('secondId')(child3), child2);

  // unresolvable id causes ref to be set to 'null'.
  model.observableModel.changeValue(child2, 'refId', 88);
  QUnit.assert.deepEqual(test.getReference(child2, 'refId'), undefined);
  QUnit.assert.deepEqual(model.referencingModel.resolveId(child2.refId), undefined);
});

QUnit.test("referencingModel getReferenceFn", function() {
  const model = { root: {} };
  const test = dataModels.referencingModel.extend(model);
  // Multiple invocations return the same function (cached).
  const fn = test.getReferenceFn('ref attr name');
  // The result of invoking the function on an object without the attribute is undefined.
  QUnit.assert.deepEqual(fn({}), undefined);
  const fn2 = test.getReferenceFn('ref attr name');
  QUnit.assert.deepEqual(fn, fn2);
});

// Instancing model unit tests.

QUnit.test("instancingModel isomorphic", function() {
  // TODO add some references.
  const test_data = {
    id: 1,
    item: { id: 2, },
    items: [
      {
        id: 3,
        items: [
          { id: 4, x: 0 },
          { id: 5, x: 1 },
        ],
      },
      {
        id: 6,
        items: [
          { id: 7, x: 0 },
          { id: 8, x: 1 },
        ],
      },
      { id: 9, foo: 'bar' },
    ],
  }
  const model = { root: test_data };
  const test = dataModels.instancingModel.extend(model);
  QUnit.assert.ok(test.isomorphic(test_data, test_data, new Map()));
  const test_data_clone = test.cloneGraph([test_data])[0];
  QUnit.assert.ok(test.isomorphic(test_data, test_data_clone, new Map()));
  QUnit.assert.ok(test.isomorphic(test_data.items[0], test_data.items[1], new Map()));
  QUnit.assert.ok(!test.isomorphic(test_data.item, test_data.items[2], new Map()));
});

// Canonical instance model unit tests.

QUnit.test("canonicalInstanceModel canonical tracking", function() {
  // TODO add some references.
  const test_data = {
    id: 1,
    items: [
    ],
    canonicals: [
    ],
  },
  canonical1 = {
    id: 2,
    items: [
      { id: 3,
        prop: 'x',
      }
    ]
  },
  instance1 = {
    id: 4,
    canonicalId: 2,
  },
  instance2 = {
    id: 5,
    canonicalId: 2,
  }

  const model = { root: test_data };
  const test = dataModels.canonicalInstanceModel.extend(model);

  const observableModel = model.observableModel,
        referencingModel = model.referencingModel,
        transactionModel = model.transactionModel;
  QUnit.assert.ok(observableModel);
  QUnit.assert.ok(referencingModel);
  QUnit.assert.ok(transactionModel);

  const internal1 = test.internalize(canonical1);
  QUnit.assert.ok(test_data.canonicals.length === 1);
  QUnit.assert.deepEqual(internal1, canonical1);
  QUnit.assert.deepEqual(test_data.canonicals[0], internal1);

  observableModel.insertElement(test_data, 'items', 0, instance1);
  QUnit.assert.deepEqual(referencingModel.getReference(instance1, 'canonicalId'), internal1);
  QUnit.assert.ok(test_data.canonicals.length === 1);
  QUnit.assert.deepEqual(test_data.canonicals[0], canonical1);

  observableModel.insertElement(test_data, 'items', 0, instance2);
  QUnit.assert.deepEqual(referencingModel.getReference(instance2, 'canonicalId'), internal1);
  QUnit.assert.ok(test_data.canonicals.length === 1);
  QUnit.assert.deepEqual(test_data.canonicals[0], canonical1);

  // Remove both instances. canonical should also be removed.
  transactionModel.beginTransaction();
  observableModel.removeElement(test_data, 'items', 0);
  observableModel.removeElement(test_data, 'items', 0);
  transactionModel.endTransaction();
  QUnit.assert.ok(test_data.canonicals.length === 0);
});

// Hierarchical model unit tests.

QUnit.test("hierarchicalModel extend", function() {
  const model = { root: {} };
  const test = dataModels.hierarchicalModel.extend(model);
  QUnit.assert.deepEqual(test, model.hierarchicalModel);
  QUnit.assert.ok(model.observableModel);
});

QUnit.test("hierarchicalModel", function() {
  const child1 = { id: 3 },
        child2 = { id: 4 },
        child3 = { id: 5 };
  child2.items = [ child3 ];
  const root = {
    id: 1,
    item: { id: 2 },
    items: [
      child1,
    ],
  };
  const model = { root: root },
        test = dataModels.hierarchicalModel.extend(model);
  QUnit.assert.deepEqual(test.getParent(root), null);
  QUnit.assert.deepEqual(test.getParent(child1), root);

  // Append child2 and subtree to root.
  model.observableModel.insertElement(root, 'items', root.items.length, child2);
  QUnit.assert.deepEqual(test.getParent(child2), root);
  QUnit.assert.deepEqual(test.getParent(child3), child2);

  const selection = dataModels.selectionModel.extend(model);
  selection.set([ root, child1, child2, child3 ]);
  selection.set(test.reduceSelection());
  const contents = selection.contents();
  QUnit.assert.deepEqual(contents.length, 1);
  QUnit.assert.deepEqual(contents[0], root);

  // Test LCA.
  QUnit.assert.deepEqual(test.getLineage(child3), [child3, child2, root]);
  QUnit.assert.deepEqual(test.getLowestCommonAncestor(root, child1), root);
  QUnit.assert.deepEqual(test.getLowestCommonAncestor(child3, child1), root);
  QUnit.assert.deepEqual(test.getLineage(child2), [child2, root]);
  QUnit.assert.deepEqual(test.getLowestCommonAncestor(child1, child2), root);

  // Remove child3 from child2.
  model.observableModel.removeElement(child2, 'items', child2.items.indexOf(child3));
  QUnit.assert.deepEqual(test.getParent(child3), null);
  // Remove child1 from root.
  model.observableModel.removeElement(root, 'items', root.items.indexOf(child1));
  QUnit.assert.deepEqual(test.getParent(child1), null);
});

// Selection model unit tests.

QUnit.test("selectionModel extend", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  QUnit.assert.deepEqual(test, model.selectionModel);
  QUnit.assert.ok(test.isEmpty());
  QUnit.assert.ok(!test.lastSelected());
});

QUnit.test("selectionModel add", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add('a');
  QUnit.assert.ok(!test.isEmpty());
  QUnit.assert.ok(test.contains('a'));
  QUnit.assert.deepEqual(test.contents(), ['a']);
  QUnit.assert.deepEqual(test.lastSelected(), 'a');
  test.add(['b', 'a', 'c']);
  QUnit.assert.deepEqual(test.contents(), ['c', 'a', 'b']);
  QUnit.assert.deepEqual(test.lastSelected(), 'c');
});

QUnit.test("selectionModel remove", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add(['b', 'a', 'c']);
  test.remove('c');
  QUnit.assert.deepEqual(test.contents(), ['a', 'b']);
  QUnit.assert.deepEqual(test.lastSelected(), 'a');
  test.remove('d');  // not selected
  QUnit.assert.deepEqual(test.contents(), ['a', 'b']);
  QUnit.assert.deepEqual(test.lastSelected(), 'a');
});

QUnit.test("selectionModel toggle", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.add(['a', 'b', 'c']);
  test.toggle('c');
  QUnit.assert.deepEqual(test.contents(), ['b', 'a']);
  QUnit.assert.deepEqual(test.lastSelected(), 'b');
  test.toggle('c');
  QUnit.assert.deepEqual(test.contents(), ['c', 'b', 'a']);
  QUnit.assert.deepEqual(test.lastSelected(), 'c');
});

QUnit.test("selectionModel set", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.set('a');
  QUnit.assert.deepEqual(test.contents(), ['a']);
  QUnit.assert.deepEqual(test.lastSelected(), 'a');
  test.set(['a', 'b', 'c']);
  QUnit.assert.deepEqual(test.contents(), ['c', 'b', 'a']);
  QUnit.assert.deepEqual(test.lastSelected(), 'c');
});

QUnit.test("selectionModel select", function() {
  const model = { root: {} };
  const test = dataModels.selectionModel.extend(model);
  test.set(['a', 'b', 'c']);
  test.select('d', true);
  QUnit.assert.deepEqual(test.contents(), ['d', 'c', 'b', 'a']);
  test.select('d', true);
  QUnit.assert.deepEqual(test.contents(), ['c', 'b', 'a']);
  test.select('a', false);
  QUnit.assert.deepEqual(test.contents(), ['a', 'c', 'b']);
  test.select('a', true);
  QUnit.assert.deepEqual(test.contents(), ['c', 'b']);
});

})();

