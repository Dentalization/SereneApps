import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StatPill from '../src/components/shared/StatPill.jsx';

function collectText(node, values = []) {
  if (typeof node === 'string') {
    values.push(node);
    return values;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, values));
    return values;
  }
  if (node?.children) {
    collectText(node.children, values);
  }
  return values;
}

describe('mobile shared components', () => {
  test('StatPill renders label and value without a physical device', () => {
    let tree;

    act(() => {
      tree = renderer.create(
        <StatPill
          icon="calendar-check"
          label="Janji"
          value="3"
          variant="horizontal"
        />
      );
    });

    const textValues = collectText(tree.toJSON());

    expect(textValues).toContain('Janji');
    expect(textValues).toContain('3');
  });
});
